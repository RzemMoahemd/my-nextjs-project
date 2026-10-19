const fs = require('fs');
const f = 'c:\\Users\\Rzem\\OneDrive\\Bureau\\clothes2\\app\\api\\cart\\release\\route.ts';
let c = fs.readFileSync(f, 'utf8');

const oldBlock = `import { adjustInventoryQuantity, cleanupExpiredReservations } from "@/lib/inventory"`;
const newBlock = `import { cleanupExpiredReservations } from "@/lib/inventory"`;

if (c.includes(oldBlock)) {
  c = c.replace(oldBlock, newBlock);
  console.log('Import replaced');
} else {
  console.log('Import NOT found');
}

const oldBlock2 = `    const { data: reservation, error } = await adminClient
      .from("cart_reservations")
      .select("*")
      .eq("id", reservation_id)
      .single()

    if (error || !reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 })
    }

    await adjustInventoryQuantity(adminClient, reservation.product_id, reservation.size, reservation.color || 'Standard', reservation.quantity)
    await adminClient.from("cart_reservations").delete().eq("id", reservation_id)`;

const newBlock2 = `    // T05 : Libération atomique (restauration stock + suppression réservation dans une transaction)
    const { data, error } = await adminClient
      .rpc("release_cart_reservation", {
        p_reservation_id: reservation_id,
      })
      .single()

    if (error || !data?.success) {
      throw new Error(data?.error_message ?? "Failed to release reservation")
    }`;

if (c.includes(oldBlock2)) {
  c = c.replace(oldBlock2, newBlock2);
  console.log('Block replaced');
} else {
  console.log('Block2 NOT found');
}

fs.writeFileSync(f, c, 'utf8');
console.log('Done');