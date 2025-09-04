const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      default: "",
    },
    images: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true });
module.exports = mongoose.model("Review", reviewSchema);
