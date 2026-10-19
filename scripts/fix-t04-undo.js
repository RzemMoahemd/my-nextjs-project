const fs = require('fs');
const f = 'c:\\Users\\Rzem\\OneDrive\\Bureau\\clothes2\\app\\api\\orders\\[id]\\route.ts';
let content = fs.readFileSync(f, 'utf8');

// Trouver le d\u00e9but du bloc UNDO (pas d'accent dans ce marqueur)
const startMarker = 'if (status === "pending" && previousOrder.status === "cancelled") {';
const startIdx = content.indexOf(startMarker);
if (startIdx === -1) {
  console.log('START MARKER NOT FOUND');
  process.exit(1);
}

// Trouver la fin du bloc en comptant les accolades
let depth = 0;
let endIdx = -1;
for (let i = startIdx; i < content.length; i++) {
  if (content[i] === '{') depth++;
  if (content[i] === '}') {
    depth--;
    if (depth === 0) {
      endIdx = i + 1;
      break;
    }
  }
}
if (endIdx === -1) {
  console.log('END NOT FOUND');
  process.exit(1);
}

const oldBlock = content.substring(startIdx, endIdx);
console.log('Old block found, length:', oldBlock.length);

// Nouveau bloc : uniquement ASCII, accents cod\u00e9s en \uXXXX
const newBlock = `    // Cas 3: UNDO temporaire d'annulation (remettre au statut pr\u00e9c\u00e9dent)
    // Maintenant g\u00e9r\u00e9 automatiquement par getAllowedTransitions() + logique d'inventaire
    if (status === "pending" && previousOrder.status === "cancelled") {
      // UNDO autoris\u00e9 (validation d\u00e9j\u00e0 faite par getAllowedTransitions)
      // Utiliser le statut pr\u00e9c\u00e9dent sauvegard\u00e9 lors de l'annulation
      const actualTargetStatus = previousOrder.previous_status || "pending"

      // T04 : V\u00e9rifier le stock AVANT de r\u00e9activer la commande annul\u00e9e
      // Si le stock n'est plus disponible, rejeter l'UNDO pour \u00e9viter la survente
      if (inventoryRestored) {
        const undoItems = Array.isArray(previousOrder.items) ? previousOrder.items : []
        const stockCheck = await verifyStockAvailability(adminClient, undoItems)

        if (!stockCheck.available) {
          console.error("[v0] Stock insufficient for UNDO:", id, stockCheck.insufficientItems)
          return NextResponse.json(
            {
              error: "Stock insuffisant pour r\u00e9activer cette commande",
              details: stockCheck.insufficientItems,
            },
            { status: 400 }
          )
        }

        console.log("[v0] UNDO cancellation - removing inventory")
        for (const item of undoItems) {
          if (item.product_id && item.size && item.quantity) {
            const color = item.color || 'Standard'
            console.log(
              "[v0] Adjusting inventory:",
              item.product_id,
              item.size,
              color,
              "-",
              item.quantity
            )
            try {
              await adjustInventoryQuantity(
                adminClient,
                item.product_id,
                item.size,
                color,
                -item.quantity
              )
            } catch (inventoryError) {
              console.error("[v0] Inventory adjustment failed:", inventoryError)
              // Ne pas ignorer l'erreur : si la r\u00e9servation \u00e9choue apr\u00e8s v\u00e9rification,
              // c'est un probl\u00e8me critique qui doit bloquer l'UNDO
              return NextResponse.json(
                {
                  error: "\u00c9chec de la r\u00e9servation du stock lors de la r\u00e9activation",
                  details: inventoryError instanceof Error ? inventoryError.message : String(inventoryError),
                },
                { status: 500 }
              )
            }
          }
        }
        inventoryRestored = false
        updateData.inventory_restored = inventoryRestored
      }

      // Forcer le statut cible pour l'UNDO
      updateData.status = actualTargetStatus
      console.log("[v0] UNDO: changed target status to:", actualTargetStatus)

      // Nettoyer automatiquement les m\u00e9tadonn\u00e9es UNDO lors d'un UNDO r\u00e9ussi
      finalCanUndoCancel = false
      finalCancelledAt = null
      finalPreviousStatus = null // Nettoyer aussi le previous_status apr\u00e8s utilisation
      console.log("[v0] UNDO successful - cleaning up metadata")
    }`;

content = content.substring(0, startIdx) + newBlock + content.substring(endIdx);
fs.writeFileSync(f, content, 'utf8');
console.log('SUCCESS: Block replaced');