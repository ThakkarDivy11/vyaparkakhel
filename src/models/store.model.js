const mongoose = require("mongoose");
const { Schema } = mongoose;

const StoreItemSchema = new Schema(
  {
    itemId: {
      type: String,
      required: [true, "itemId is required"],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
      maxlength: [100, "Item name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Item description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    price: {
      type: Number,
      required: [true, "Item price is required"],
      min: [0, "Price cannot be negative"],
    },
    image: {
      type: String,
      trim: true,
      default: "/images/default_store_item.png",
    },
    tag: {
      type: String,
      trim: true,
      maxlength: [20, "Tag cannot exceed 20 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StoreItem", StoreItemSchema);
