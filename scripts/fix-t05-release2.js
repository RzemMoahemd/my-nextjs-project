const fs = require('fs');
const f = 'c:\\Users\\Rzem\\OneDrive\\Bureau\\clothes2\\app\\api\\cart\\release\\route.ts';
let c = fs.readFileSync(f, 'utf8');

const oldBlock = `    await adjustInventoryQuantity(adminClient, reservation.product_id, reservation.size, reservation.color || 'Standard', reservation.quantity)
    await adminClient.from("cart_reservations").delete().eq("id", reservation_id)`;

const newBlock = `    // T05 : Libération atomique (restauration stock + suppression réservation dans une transaction)
    const { data, error } = await adminClient
      .rpc("release_cart_reservation", {
        p_reservation_id: reservation_id,
      })
      .single()

    if (error || !data?.success) {
      throw new Error(data?.error_message ?? "Failed to release reservation")
    }`;

if (c.includes(oldBlock)) {
  c = c.replace(oldBlock, newBlock);
  fs.writeFileSync(f, c, 'utf8');
  console.log('Block replaced successfully');
} else {
  console.log('Block NOT found');
  const idx = c.indexOf('adjustInventoryQuantity');
  if (idx >= 0) {
    console.log('Found at index', idx);
    console.log('Context:', JSON.stringify(c.substring(idx - 50, idx + 200)));
  }
}