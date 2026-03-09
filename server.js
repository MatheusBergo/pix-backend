const express = require("express")
const fetch = require("node-fetch")
const crypto = require("crypto")

const app = express()
app.use(express.json())

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN
const BOTPRESS_TOKEN = process.env.BOTPRESS_TOKEN

// ===============================
// TESTE API
// ===============================
app.get("/test", (req, res) => {
  res.send("API funcionando")
})

// ===============================
// GERAR PIX
// ===============================
app.post("/gerar-pix", async (req, res) => {

  console.log("===== NOVA REQUISIÇÃO PIX =====")
  console.log(req.body)

  try {

    const { valor, nomeCliente, conversationId } = req.body

    const idempotencyKey = crypto.randomUUID()

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + MP_ACCESS_TOKEN,
        "X-Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify({
        transaction_amount: Number(parseFloat(valor).toFixed(2)),
        description: "Pedido via WhatsApp",
        payment_method_id: "pix",
        notification_url: "https://pix-backend-eva7.onrender.com/webhook",
        payer: {
          email: "cliente@email.com",
          first_name: nomeCliente || "Cliente"
        },
        external_reference: conversationId
      })
    })

    const data = await response.json()

    console.log("Resposta Mercado Pago:")
    console.log(data)

    const qrCode = data.point_of_interaction.transaction_data.qr_code
    const linkPagamento = data.point_of_interaction.transaction_data.ticket_url

    const mensagemPix =
`💳 Pagamento via Pix

Copie o código abaixo e cole no aplicativo do seu banco:

${qrCode}

Ou pague pelo link:
${linkPagamento}

Assim que o pagamento for confirmado seu pedido será preparado 🍕🔥`

    res.json({
      mensagemPix
    })

  } catch (error) {

    console.error("ERRO AO GERAR PIX")
    console.error(error)

    res.json({
      mensagemPix: "Erro ao gerar Pix. Tente novamente."
    })
  }
})


// ===============================
// WEBHOOK MERCADO PAGO
// ===============================
app.post("/webhook", async (req, res) => {

  console.log("Webhook recebido")
  console.log(req.body)

  try {

    const paymentId = req.body.data?.id

    if (!paymentId) {
      return res.sendStatus(200)
    }

    const response = await fetch(
      "https://api.mercadopago.com/v1/payments/" + paymentId,
      {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + MP_ACCESS_TOKEN
        }
      }
    )

    const payment = await response.json()

    console.log("Status pagamento:", payment.status)

    if (payment.status === "approved") {

      await fetch("https://api.botpress.cloud/v1/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + BOTPRESS_TOKEN
        },
        body: JSON.stringify({
          conversationId: payment.external_reference,
          payload: {
            type: "text",
            text:
`✅ Pagamento confirmado!

Seu pedido já está sendo preparado 🍕🔥

Tempo médio de entrega: 90 minutos.`
          }
        })
      })

    }

    res.sendStatus(200)

  } catch (error) {

    console.error("Erro webhook")
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
