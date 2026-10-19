const fs = require('fs');

// ============================================
// 1. Corriger cart/reserve/route.ts
// ============================================
let f = 'c:\\Users\\Rzem\\OneDrive\\Bureau\\clothes2\\app\\api\\cart\\reserve\\route.ts';
let c = fs.readFileSync(f, 'utf8');

// Ajouter l'import de UUID type si nécessaire (déjà présent dans le projet)

// Remplacer tous les appels .rpc().single() par des versions typées
// Pattern 1: reserve_cart_item
const old1 = `      const { data, error } = await adminClient
        .rpc("reserve_cart_item", {
          p_cart_id: cart_id,
          p_product_id: product_id,
          p_size: size,
          p_color: variantColor,
          p_quantity: quantity,
          p_expires_at: expiresAt,
        })
        .single()`;

const new1 = `      const { data, error } = await adminClient
        .rpc("reserve_cart_item", {
          p_cart_id: cart_id,
          p_product_id: product_id,
          p_size: size,
          p_color: variantColor,
          p_quantity: quantity,
          p_expires_at: expiresAt,
        })
        .single() as { data: { reservation_id: string; success: boolean; error_message: string | null } | null; error: any }`;

if (c.includes(old1)) {
  c = c.replace(old1, new1);
  console.log('reserve_cart_item typed');
} else {
  console.log('reserve_cart_item pattern NOT found');
}

// Pattern 2: release_cart_reservation (dans reserve route)
const old2 = `      const { data: releaseData, error: releaseError } = await adminClient
        .rpc("release_cart_reservation", {
          p_reservation_id: reservation_id,
        })
        .single()`;

const new2 = `      const { data: releaseData, error: releaseError } = await adminClient
        .rpc("release_cart_reservation", {
          p_reservation_id: reservation_id,
        })
        .single() as { data: { success: boolean; error_message: string | null } | null; error: any }`;

if (c.includes(old2)) {
  c = c.replace(old2, new2);
  console.log('release_cart_reservation typed (reserve)');
} else {
  console.log('release_cart_reservation pattern NOT found (reserve)');
}

// Pattern 3: update_cart_reservation_quantity
const old3 = `      const { data: updateData, error: updateError } = await adminClient
        .rpc("update_cart_reservation_quantity", {
          p_reservation_id: reservation_id,
          p_new_quantity: quantity,
          p_expires_at: expiresAt,
        })
        .single()`;

const new3 = `      const { data: updateData, error: updateError } = await adminClient
        .rpc("update_cart_reservation_quantity", {
          p_reservation_id: reservation_id,
          p_new_quantity: quantity,
          p_expires_at: expiresAt,
        })
        .single() as { data: { success: boolean; error_message: string | null } | null; error: any }`;

if (c.includes(old3)) {
  c = c.replace(old3, new3);
  console.log('update_cart_reservation_quantity typed');
} else {
  console.log('update_cart_reservation_quantity pattern NOT found');
}

fs.writeFileSync(f, c, 'utf8');

// ============================================
// 2. Corriger cart/release/route.ts
// ============================================
f = 'c:\\Users\\Rzem\\OneDrive\\Bureau\\clothes2\\app\\api\\cart\\release\\route.ts';
c = fs.readFileSync(f, 'utf8');

// Corriger le conflit de variable 'error' (ligne 17 et 28)
// Renommer le premier 'error' en 'fetchError'
const oldFetch = `    const { data: reservation, error } = await adminClient
      .from("cart_reservations")
      .select("*")
      .eq("id", reservation_id)
      .single()`;

const newFetch = `    const { data: reservation, error: fetchError } = await adminClient
      .from("cart_reservations")
      .select("*")
      .eq("id", reservation_id)
      .single()`;

if (c.includes(oldFetch)) {
  c = c.replace(oldFetch, newFetch);
  console.log('fetchError renamed');
} else {
  console.log('fetchError pattern NOT found');
}

// Corriger la condition qui utilise encore 'error' au lieu de 'fetchError'
const oldCond = `    if (error || !reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 })
    }`;

const newCond = `    if (fetchError || !reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 })
    }`;

if (c.includes(oldCond)) {
  c = c.replace(oldCond, newCond);
  console.log('condition fixed');
} else {
  console.log('condition pattern NOT found');
}

// Typer le résultat RPC
const oldRpc = `    const { data, error } = await adminClient
      .rpc("release_cart_reservation", {
        p_reservation_id: reservation_id,
      })
      .single()`;

const newRpc = `    const { data, error } = await adminClient
      .rpc("release_cart_reservation", {
        p_reservation_id: reservation_id,
      })
      .single() as { data: { success: boolean; error_message: string | null } | null; error: any }`;

if (c.includes(oldRpc)) {
  c = c.replace(oldRpc, newRpc);
  console.log('release_cart_reservation typed (release)');
} else {
  console.log('release_cart_reservation pattern NOT found (release)');
}

fs.writeFileSync(f, c, 'utf8');
console.log('All fixes done');