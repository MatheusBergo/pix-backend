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
        payer: {
          email: "pix@cliente.com",
          first_name: nomeCliente || "Cliente"
        },
        external_reference: conversationId
      })
    })

    const data = await response.json()

    console.log("Resposta Mercado Pago:")
    console.log(data)

    // Se o Mercado Pago não retornar PIX, mostrar o erro real
    if (!data.point_of_interaction) {
      return res.json({
        erro: "Mercado Pago não retornou QR Code",
        respostaMercadoPago: data
      })
    }

    res.json({
      id: data.id,
      qr_code: data.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64
    })

  } catch (error) {

    console.error("ERRO AO GERAR PIX")
    console.error(error)

    res.json({
      erro: "Erro interno",
      detalhes: error.message
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
            text: "✅ Pix recebido com sucesso!\n\nObrigado pela confiança 🙏\nSeu pedido já está sendo preparado 🍕🔥"
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
