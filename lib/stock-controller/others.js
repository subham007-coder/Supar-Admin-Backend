require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../../models/Product");

// const base = 'https://api-m.sandbox.paypal.com';

// decrease product quantity after a order created
const handleProductQuantity = async (cart) => {
  console.log("📦 [STOCK DEBUG] Starting handleProductQuantity");
  console.log("🛒 [STOCK DEBUG] Cart items:", cart.map(item => ({
    _id: item._id,
    name: item.name,
    quantity: item.quantity,
    selectedLength: item.selectedLength,
    selectedCurl: item.selectedCurl
  })));

  try {
    for (const p of cart) {
      console.log("🔄 [STOCK DEBUG] Processing cart item:", {
        productId: p._id,
        name: p.name,
        quantity: p.quantity,
        selectedLength: p.selectedLength,
        selectedCurl: p.selectedCurl
      });

      // Find the product first to check if it has variants
      const product = await Product.findById(p._id);
      
      if (!product) {
        console.error("❌ [STOCK DEBUG] Product not found:", p._id);
        continue;
      }

      console.log("📋 [STOCK DEBUG] Product found:", {
        isCombination: product.isCombination,
        totalStock: product.totalStock,
        variants: product.variants?.length || 0
      });

      if (product.isCombination && p.selectedLength && p.selectedCurl) {
        // Handle variant-based products (Length/Curl combinations)
        console.log("🔧 [STOCK DEBUG] Updating variant stock for:", {
          length: p.selectedLength,
          curl: p.selectedCurl,
          quantity: p.quantity
        });

        // Find the specific variant
        const variantIndex = product.variants.findIndex(v => 
          v.length === p.selectedLength && v.curl === p.selectedCurl
        );

        if (variantIndex === -1) {
          console.error("❌ [STOCK DEBUG] Variant not found:", {
            length: p.selectedLength,
            curl: p.selectedCurl,
            availableVariants: product.variants.map(v => ({ length: v.length, curl: v.curl, stock: v.stock }))
          });
          continue;
        }

        // Check if enough stock is available
        const variant = product.variants[variantIndex];
        if (variant.stock < p.quantity) {
          console.error("❌ [STOCK DEBUG] Insufficient variant stock:", {
            requested: p.quantity,
            available: variant.stock,
            length: p.selectedLength,
            curl: p.selectedCurl
          });
          throw new Error(`Insufficient stock for ${p.selectedLength} ${p.selectedCurl} variant. Available: ${variant.stock}, Requested: ${p.quantity}`);
        }

        // Update both variant stock and total stock
        await Product.findOneAndUpdate(
          {
            _id: p._id,
            "variants.length": p.selectedLength,
            "variants.curl": p.selectedCurl
          },
          {
            $inc: {
              totalStock: -p.quantity,
              "variants.$.stock": -p.quantity,
              sales: p.quantity,
            },
          },
          {
            new: true,
          }
        );

        console.log("✅ [STOCK DEBUG] Variant stock updated successfully");
      } else {
        // Handle simple products (no variants)
        console.log("📦 [STOCK DEBUG] Updating simple product stock");
        
        // Check if enough stock is available
        if (product.stock < p.quantity) {
          console.error("❌ [STOCK DEBUG] Insufficient product stock:", {
            requested: p.quantity,
            available: product.stock
          });
          throw new Error(`Insufficient stock. Available: ${product.stock}, Requested: ${p.quantity}`);
        }

        await Product.findOneAndUpdate(
          {
            _id: p._id,
          },
          {
            $inc: {
              stock: -p.quantity,
              sales: p.quantity,
            },
          },
          {
            new: true,
          }
        );

        console.log("✅ [STOCK DEBUG] Simple product stock updated successfully");
      }
    }
    
    console.log("🎉 [STOCK DEBUG] All product quantities updated successfully");
  } catch (err) {
    console.error("❌ [STOCK DEBUG] Error in handleProductQuantity:", err.message);
    throw err; // Re-throw to handle in order processing
  }
};

const handleProductAttribute = async (key, value, multi) => {
  try {
    // const products = await Product.find({ 'variants.1': { $exists: true } });
    const products = await Product.find({ isCombination: true });

    // console.log('products', products);

    if (multi) {
      for (const p of products) {
        await Product.updateOne(
          { _id: p._id },
          {
            $pull: {
              variants: { [key]: { $in: value } },
            },
          }
        );
      }
    } else {
      for (const p of products) {
        // console.log('p', p._id);
        await Product.updateOne(
          { _id: p._id },
          {
            $pull: {
              variants: { [key]: value },
            },
          }
        );
      }
    }
  } catch (err) {
    console.log("err, when delete product variants", err.message);
  }
};

module.exports = {
  handleProductQuantity,
  handleProductAttribute,
};
