const fs = require('fs');
const f = 'c:\\Users\\Rzem\\OneDrive\\Bureau\\clothes2\\app\\api\\cart\\reserve\\route.ts';
let c = fs.readFileSync(f, 'utf8');

// Remplacer le bloc nouvelle réservation
const old1 = `      await adjustInventoryQuantity(adminClient, product_id, size, variantColor, -quantity)

      const { data, error } = await adminClient
        .from("cart_reservations")
        .insert([
          {
            cart_id,
            product_id,
            size,
            color: variantColor,
            quantity,
            expires_at: expiresAt,
          },
        ])
        .select()
        .single()

      if (error || !data) {
        throw error ?? new Error("Failed to create reservation")
      }

      return NextResponse.json(
        {
          reservation_id: data.id,
          quantity: data.quantity,
          expires_at: data.expires_at,
        },
        { status: 201 },
      )`;

const new1 = `      // T05 : Réservation atomique (stock + insertion réservation dans une transaction)
      const { data, error } = await adminClient
        .rpc("reserve_cart_item", {
          p_cart_id: cart_id,
          p_product_id: product_id,
          p_size: size,
          p_color: variantColor,
          p_quantity: quantity,
          p_expires_at: expiresAt,
        })
        .single()

      if (error || !data?.success) {
        throw new Error(data?.error_message ?? "Failed to create reservation")
      }

      return NextResponse.json(
        {
          reservation_id: data.reservation_id,
          quantity,
          expires_at: expiresAt,
        },
        { status: 201 },
      )`;

if (c.includes(old1)) {
  c = c.replace(old1, new1);
  console.log('Block 1 replaced');
} else {
  console.log('Block 1 NOT found');
}

// Remplacer le bloc suppression (quantity <= 0)
const old2 = `      await adjustInventoryQuantity(adminClient, product_id, size, currentReservation.color || 'Standard', currentReservation.quantity)
      await adminClient.from("cart_reservations").delete().eq("id", reservation_id)`;

const new2 = `      // T05 : Libération atomique (restauration stock + suppression réservation dans une transaction)
      const { data: releaseData, error: releaseError } = await adminClient
        .rpc("release_cart_reservation", {
          p_reservation_id: reservation_id,
        })
        .single()

      if (releaseError || !releaseData?.success) {
        throw new Error(releaseData?.error_message ?? "Failed to release reservation")
      }`;

if (c.includes(old2)) {
  c = c.replace(old2, new2);
  console.log('Block 2 replaced');
} else {
  console.log('Block 2 NOT found');
}

fs.writeFileSync(f, c, 'utf8');
console.log('Done');