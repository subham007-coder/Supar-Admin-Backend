const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: false,
    },
    sku: {
      type: String,
      required: false,
    },
    barcode: {
      type: String,
      required: false,
    },
    title: {
      type: Object,
      required: true,
    },
    description: {
      type: Object,
      required: false,
    },
    shortDescription: {
      type: Object,
      required: false,
    },
    // Add Key Features here
    keyFeatures: {
      type: [String],
      required: false,
      default: [],
    },
    slug: {
      type: String,
      required: true,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
      },
    ],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    image: {
      type: Array,
      required: false,
    },
    stock: {
      type: Number,
      required: false,
    },

    sales: {
      type: Number,
      required: false,
    },
    tag: {
      type: [String],
      required: false,
      default: [],
    },
    recommendedFor: {
      type: [String],
      required: false,
      default: [],
    },
    prices: {
      originalPrice: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      discount: {
        type: Number,
        required: false,
      },
    },
    // variants: [{
    //   length: {
    //     type: String,
    //     enum: ['8mm', '9mm', '10mm', '11mm', '12mm', '13mm', '14mm', '15mm', 'Mix'],
    //     required: true
    //   },
    //   curl: {
    //     type: String,
    //     enum: ['C', 'D', 'DD'],
    //     required: true
    //   },
    //   stock: {
    //     type: Number,
    //     default: 0,
    //     min: 0
    //   },
    //   enabled: {
    //     type: Boolean,
    //     default: true
    //   }
    // }],
    variants: [{}],
    isCombination: {
      type: Boolean,
      required: true,
    },
    average_rating: {
      type: Number,
      default: 0,
    },
    total_reviews: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      default: "show",
      enum: ["show", "hide"],
    },
  },
  {
    timestamps: true,
  }
);

// module.exports = productSchema;

const Product = mongoose.model("Product", productSchema);
module.exports = Product;