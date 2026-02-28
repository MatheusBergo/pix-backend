import express from "express"
import fetch from "node-fetch"

const app = express()
app.use(express.json())

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN
const BOTPRESS_TOKEN = process.env.BOTPRESS_TOKEN

app.post("/gerar-pix", async (req, res) => {
  try {
    const { valor, nomeCliente, conversationId } = req.body

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": Bearer ${MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        transaction_amount: Number(valor),
        description: "Pedido",
        payment_method_id: "pix",
        payer: {
          email: "cliente@email.com",
          first_name: nomeCliente
        },
        external_reference: conversationId
      })
    })

    const data = await response.json()

    res.json({
      codigoPix: data.point_of_interaction.transaction_data.qr_code
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ erro: err.message })
  }
})

app.post("/webhook-mercadopago", async (req, res) => {
  const paymentId = req.body.data?.id

  if (paymentId) {
    const paymentResponse = await fetch(
      https://api.mercadopago.com/v1/payments/${paymentId},
      {
        headers: {
          "Authorization": Bearer ${MP_ACCESS_TOKEN}
        }
      }
    )

    const payment = await paymentResponse.json()

    if (payment.status === "approved") {
      await fetch("https://api.botpress.cloud/v1/messages", {
        method: "POST",
        headers: {
          "Authorization": Bearer ${BOTPRESS_TOKEN},
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          conversationId: payment.external_reference,
          type: "text",
          payload: {
            text: "✅ Pix recebido com sucesso!\n\nObrigado pela confiança 🙏\nSeu pedido já está sendo preparado 🍕🔥"
          }
        })
      })
    }
  }

  res.sendStatus(200)
})

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000")
})
