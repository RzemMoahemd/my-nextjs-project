const fs = require('fs');
const f = 'c:\\Users\\Rzem\\OneDrive\\Bureau\\clothes2\\app\\api\\cart\\reserve\\route.ts';
let c = fs.readFileSync(f, 'utf8');

const oldBlock = `    const delta = quantity - currentReservation.quantity
    if (delta !== 0) {
      await adjustInventoryQuantity(adminClient, product_id, size, currentReservation.color || 'Standard', -delta)
    }

    const { data: updated, error: updateError } = await adminClient
      .from("cart_reservations")
      .update({
        quantity,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reservation_id)
      .select()
      .single()

    if (updateError || !updated) {
      throw updateError ?? new Error("Failed to update reservation")
    }

    return NextResponse.json({
      reservation_id,
      quantity: updated.quantity,
      expires_at: updated.expires_at,
    })`;

const newBlock = `    const delta = quantity - currentReservation.quantity
    if (delta !== 0) {
      // T05 : Mise à jour atomique (stock + mise à jour réservation dans une transaction)
      const { data: updateData, error: updateError } = await adminClient
        .rpc("update_cart_reservation_quantity", {
          p_reservation_id: reservation_id,
          p_new_quantity: quantity,
          p_expires_at: expiresAt,
        })
        .single()

      if (updateError || !updateData?.success) {
        throw new Error(updateData?.error_message ?? "Failed to update reservation")
      }

      return NextResponse.json({
        reservation_id,
        quantity,
        expires_at: expiresAt,
      })
    }

    // Pas de changement de quantité, juste mettre à jour l'expiration
    const { data: updated, error: updateError } = await adminClient
      .from("cart_reservations")
      .update({
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reservation_id)
      .select()
      .single()

    if (updateError || !updated) {
      throw updateError ?? new Error("Failed to update reservation")
    }

    return NextResponse.json({
      reservation_id,
      quantity: updated.quantity,
      expires_at: updated.expires_at,
    })`;

if (c.includes(oldBlock)) {
  c = c.replace(oldBlock, newBlock);
  fs.writeFileSync(f, c, 'utf8');
  console.log('Block replaced successfully');
} else {
  console.log('Block NOT found');
  // Debug: show what we have around delta
  const idx = c.indexOf('const delta');
  if (idx >= 0) {
    console.log('Found delta at index', idx);
    console.log('Context:', JSON.stringify(c.substring(idx, idx + 500)));
  }
}