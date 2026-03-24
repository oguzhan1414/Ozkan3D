import PDFDocument from 'pdfkit'

export const generateInvoicePDF = (order, user) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const buffers = []

    doc.on('data', chunk => buffers.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(buffers)))
    doc.on('error', reject)

    // Header
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('OZKAN3D.DESIGN', 50, 50)

    doc
      .fontSize(10)
      .font('Helvetica')
      .text('bilgi@ozkan3d.design', 50, 80)
      .text('0216 521 38 40', 50, 95)

    // Fatura Başlık
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('FATURA', 400, 50)

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Fatura No: ${order.orderNo}`, 400, 80)
      .text(`Tarih: ${new Date(order.createdAt).toLocaleDateString('tr-TR')}`, 400, 95)

    // Çizgi
    doc
      .moveTo(50, 120)
      .lineTo(550, 120)
      .stroke()

    // Müşteri Bilgileri
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Fatura Adresi:', 50, 140)

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(user.name, 50, 160)
      .text(order.shippingAddress.address, 50, 175)
      .text(`${order.shippingAddress.district} / ${order.shippingAddress.city}`, 50, 190)
      .text(user.email, 50, 205)

    // Ürünler Başlık
    doc
      .moveTo(50, 230)
      .lineTo(550, 230)
      .stroke()

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Ürün', 50, 240)
      .text('Adet', 300, 240)
      .text('Birim Fiyat', 370, 240)
      .text('Toplam', 470, 240)

    doc
      .moveTo(50, 255)
      .lineTo(550, 255)
      .stroke()

    // Ürünler
    let y = 265
    order.items.forEach(item => {
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(item.name, 50, y, { width: 240 })
        .text(item.quantity.toString(), 300, y)
        .text(`${item.price}₺`, 370, y)
        .text(`${(item.price * item.quantity).toFixed(2)}₺`, 470, y)
      y += 25
    })

    // Toplam
    doc
      .moveTo(50, y + 10)
      .lineTo(550, y + 10)
      .stroke()

    if (order.discount > 0) {
      doc
        .fontSize(10)
        .font('Helvetica')
        .text('İndirim:', 370, y + 20)
        .text(`-${order.discount}₺`, 470, y + 20)
      y += 20
    }

    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Kargo:', 370, y + 20)
      .text(order.shippingCost === 0 ? 'Ücretsiz' : `${order.shippingCost}₺`, 470, y + 20)

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('TOPLAM:', 370, y + 40)
      .text(`${order.totalPrice}₺`, 470, y + 40)

    // Footer
    doc
      .fontSize(9)
      .font('Helvetica')
      .text('Ozkan3D.design — Türkiye\'nin 3D Baskı Mağazası', 50, 700, {
        align: 'center',
        width: 500,
      })

    doc.end()
  })
}