const express = require("express")
const fetch = require("node-fetch")

const app = express()
app.use(express.json())

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN
const BOTPRESS_TOKEN = process.env.BOTPRESS_TOKEN

// ===============================
// GERAR PIX
// ===============================
app.post("/gerar-pix", async (req, res) => {
  try {
    const { valor, nomeCliente, conversationId } = req.body

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        transaction_amount: Number(valor),
        description: "Pedido via WhatsApp",
        payment_method_id: "pix",
        payer: {
          email: "cliente@email.com",
          first_name: nomeCliente || "Cliente"
        },
        external_reference: conversationId
      })
    })

    const data = await response.json()

    res.json({
      id: data.id,
      qr_code: data.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Erro ao gerar PIX" })
  }
})


// ===============================
// WEBHOOK MERCADO PAGO
// ===============================
app.post("/webhook", async (req, res) => {
  try {
    const paymentId = req.body.data?.id

    if (!paymentId) {
      return res.sendStatus(200)
    }

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${MP_ACCESS_TOKEN}`
        }
      }
    )

    const payment = await response.json()

    if (payment.status === "approved") {
      console.log("Pagamento aprovado!")

      await fetch("https://api.botpress.cloud/v1/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${BOTPRESS_TOKEN}`
        },
        body: JSON.stringify({
          conversationId: payment.external_reference,
          payload: {
            type: "text",
            text: "✅ Pix recebido com sucesso!\n\nObrigado pela confiança 🙏\nSeu pedido já está sendo preparado 🍕🔥"
          }
        })
      })
    }

    res.sendStatus(200)

  } catch (error) {
    console.error(error)
    res.sendStatus(500)
  }
})


// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("Servidor rodando 🚀")
})
