const Product = require("../models/Product");
const mongoose = require("mongoose");
const Category = require("../models/Category");
const Review = require("../models/Review");
const { languageCodes } = require("../utils/data");

const addProduct = async (req, res) => {
  try {
    // Get the English title or the first available title
    const title = req.body.title.en || Object.values(req.body.title)[0];
    
    if (!title) {
      return res.status(400).send({
        message: "Product title is required"
      });
    }

    // Ensure all translatable fields are properly structured
    const productData = {
      ...req.body,
      slug: title.toLowerCase().replace(/[^A-Z0-9]+/ig, '-'),
      // Ensure translatable fields are objects
      title: req.body.title || {},
      description: req.body.description || {},
      shortDescription: req.body.shortDescription || {},
      variants: req.body.variants || [],
      isCombination: req.body.variants && req.body.variants.length > 0 ? true : req.body.isCombination,
    };

    console.log('Creating product with data:', {
      title: productData.title,
      isCombination: productData.isCombination,
      variants: productData.variants,
    });
    
    // Log the full variants data for debugging
    if (productData.variants && productData.variants.length > 0) {
      console.log('Variants data:', JSON.stringify(productData.variants));
    }

    const newProduct = new Product(productData);
    const product = await newProduct.save();
    res.status(201).send(product);
    
  } catch (err) {
    console.error('Product creation error:', err);
    res.status(500).send({
      message: err.message || 'Error occurred while creating product',
      error: err
    });
  }
};

const addAllProducts = async (req, res) => {
  try {
    // console.log('product data',req.body)
    await Product.deleteMany();
    await Product.insertMany(req.body);
    res.status(200).send({
      message: "Product Added successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getShowingProducts = async (req, res) => {
  try {
    const products = await Product.find({ status: "show" }).sort({ _id: -1 });
    res.send(products);
    // console.log("products", products);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getAllProducts = async (req, res) => {
  const { title, category, price, page, limit } = req.query;

  // console.log("getAllProducts");

  let queryObject = {};
  let sortObject = {};
  if (title) {
    const titleQueries = languageCodes.map((lang) => ({
      [`title.${lang}`]: { $regex: `${title}`, $options: "i" },
    }));
    queryObject.$or = titleQueries;
  }

  if (price === "low") {
    sortObject = {
      "prices.originalPrice": 1,
    };
  } else if (price === "high") {
    sortObject = {
      "prices.originalPrice": -1,
    };
  } else if (price === "published") {
    queryObject.status = "show";
  } else if (price === "unPublished") {
    queryObject.status = "hide";
  } else if (price === "status-selling") {
    queryObject.stock = { $gt: 0 };
  } else if (price === "status-out-of-stock") {
    queryObject.stock = { $lt: 1 };
  } else if (price === "date-added-asc") {
    sortObject.createdAt = 1;
  } else if (price === "date-added-desc") {
    sortObject.createdAt = -1;
  } else if (price === "date-updated-asc") {
    sortObject.updatedAt = 1;
  } else if (price === "date-updated-desc") {
    sortObject.updatedAt = -1;
  } else {
    sortObject = { _id: -1 };
  }

  // console.log('sortObject', sortObject);

  if (category) {
    queryObject.categories = category;
  }

  const pages = Number(page);
  const limits = Number(limit);
  const skip = (pages - 1) * limits;

  try {
    const totalDoc = await Product.countDocuments(queryObject);

    let products = await Product.find(queryObject)
  .populate({ path: "category", select: "_id name" })
  .populate({ path: "categories", select: "_id name" })
  .sort(sortObject)
  .skip(skip)
  .limit(limits);

// Convert discount to percentage for each product
products = products.map((product) => {
  if (product.prices?.originalPrice && product.prices?.price) {
    const original = product.prices.originalPrice;
    const current = product.prices.price;
    product.prices.discount = Math.round(((original - current) / original) * 100);
  }
  return product;
});

res.send({
  products,
  totalDoc,
  limits,
  pages,
});

  } catch (err) {
    // console.log("error", err);
    res.status(500).send({
      message: err.message,
    });
  }
};

const getProductBySlug = async (req, res) => {
  // console.log("slug", req.params.slug);
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    res.send(product);
  } catch (err) {
    res.status(500).send({
      message: `Slug problem, ${err.message}`,
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate({ path: "category", select: "_id, name" })
      .populate({ path: "categories", select: "_id name" });

    res.send(product);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateProduct = async (req, res) => {
  console.log('🔄 [PRODUCT DEBUG] Updating product:', req.params.id);
  console.log('📝 [PRODUCT DEBUG] Update data:', {
    title: req.body.title,
    description: req.body.description,
    shortDescription: req.body.shortDescription,
    hasShortDescription: !!req.body.shortDescription,
    variants: req.body.variants,
    hasVariants: !!req.body.variants,
  });

  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      // Handle translatable fields with proper merging
      if (req.body.title) {
        product.title = { ...product.title, ...req.body.title };
      }
      
      if (req.body.description) {
        product.description = { ...product.description, ...req.body.description };
      }

      // Handle shortDescription - this was missing!
      if (req.body.shortDescription) {
        product.shortDescription = { ...product.shortDescription, ...req.body.shortDescription };
        console.log('✅ [PRODUCT DEBUG] Updated shortDescription:', product.shortDescription);
      }

      if (req.body.variants) {
        product.variants = req.body.variants;
        console.log('✅ [PRODUCT DEBUG] Updated variants:', product.variants);
      }

      // Update other fields
      if (req.body.productId !== undefined) product.productId = req.body.productId;
      if (req.body.sku !== undefined) product.sku = req.body.sku;
      if (req.body.barcode !== undefined) product.barcode = req.body.barcode;
      if (req.body.slug !== undefined) product.slug = req.body.slug;
      if (req.body.categories !== undefined) product.categories = req.body.categories;
      if (req.body.category !== undefined) product.category = req.body.category;
      if (req.body.show !== undefined) product.show = req.body.show;
      if (req.body.isCombination !== undefined) product.isCombination = req.body.isCombination;
      if (req.body.variants !== undefined) product.variants = req.body.variants;
      if (req.body.stock !== undefined) product.stock = req.body.stock;
      if (req.body.prices !== undefined) product.prices = req.body.prices;
      if (req.body.image !== undefined) product.image = req.body.image;
      if (req.body.tag !== undefined) product.tag = req.body.tag;
      if (req.body.status !== undefined) product.status = req.body.status;

      await product.save();
      
      console.log('✅ [PRODUCT DEBUG] Product updated successfully');
      console.log('📋 [PRODUCT DEBUG] Final shortDescription:', product.shortDescription);
      console.log('📋 [PRODUCT DEBUG] Final variants:', product.variants);
      
      res.send({ data: product, message: "Product updated successfully!" });
    } else {
      res.status(404).send({
        message: "Product Not Found!",
      });
    }
  } catch (err) {
    console.error('❌ [PRODUCT DEBUG] Update error:', err);
    res.status(404).send(err.message);
  }
};

const updateManyProducts = async (req, res) => {
  try {
    const updatedData = {};
    for (const key of Object.keys(req.body)) {
      if (
        req.body[key] !== "[]" &&
        Object.entries(req.body[key]).length > 0 &&
        req.body[key] !== req.body.ids
      ) {
        // console.log('req.body[key]', typeof req.body[key]);
        updatedData[key] = req.body[key];
      }
    }

    // console.log("updated data", updatedData);

    await Product.updateMany(
      { _id: { $in: req.body.ids } },
      {
        $set: updatedData,
      },
      {
        multi: true,
      }
    );
    res.send({
      message: "Products update successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateStatus = async (req, res) => {
  try {
    const newStatus = req.body.status;
    await Product.updateOne(
      { _id: req.params.id },
      {
        $set: {
          status: newStatus,
        },
      }
    );
    
    res.status(200).send({
      message: `Product ${newStatus} Successfully!`,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    await Product.deleteOne({ _id: req.params.id });
    res.status(200).send({
      message: "Product Deleted Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getShowingStoreProducts = async (req, res) => {
  // console.log("req.body", req);
  try {
    const queryObject = { status: "show" };

    // console.log("getShowingStoreProducts");

    const { category, title, slug } = req.query;
    // console.log("title", title);

    // console.log("query", req);

    if (category) {
      queryObject.categories = {
        $in: [category],
      };
    }

    if (title) {
      const titleQueries = languageCodes.map((lang) => ({
        [`title.${lang}`]: { $regex: `${title}`, $options: "i" },
      }));

      queryObject.$or = titleQueries;
    }
    if (slug) {
      // Use exact match for slug to avoid partial matches (e.g., 'd-curl' vs 'dd-curl')
      queryObject.slug = slug;
    }

    let products = [];
    let popularProducts = [];
    let discountedProducts = [];
    let relatedProducts = [];
    let reviews = [];

    if (slug) {
      products = await Product.find(queryObject)
        .populate({ path: "category", select: "name _id" })
        .sort({ _id: -1 })
        .limit(100);
      relatedProducts = await Product.find({
        category: products[0]?.category,
      }).populate({ path: "category", select: "_id name" });
      reviews = await Review.find({ product: products[0]._id }).populate({
        path: "user",
        select: "name image",
      });
    } else if (title || category) {
      products = await Product.find(queryObject)
        .populate({ path: "category", select: "name _id" })
        .sort({ _id: -1 })
        .limit(100);
    } else {
      popularProducts = await Product.find({ status: "show" })
        .populate({ path: "category", select: "name _id" })
        .sort({ sales: -1 })
        .limit(20);

      discountedProducts = await Product.find({
        status: "show", // Ensure status "show" for discounted products
        $or: [
          {
            $and: [
              { isCombination: true },
              {
                variants: {
                  $elemMatch: {
                    discount: { $gt: "0.00" },
                  },
                },
              },
            ],
          },
          {
            $and: [
              { isCombination: false },
              {
                $expr: {
                  $gt: [
                    { $toDouble: "$prices.discount" }, // Convert the discount field to a double
                    0,
                  ],
                },
              },
            ],
          },
        ],
      })
        .populate({ path: "category", select: "name _id" })
        .sort({ _id: -1 })
        .limit(20);
    }

    res.send({
      reviews,
      products,
      popularProducts,
      relatedProducts,
      discountedProducts,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteManyProducts = async (req, res) => {
  try {
    const cname = req.cname;
    // console.log("deleteMany", cname, req.body.ids);

    await Product.deleteMany({ _id: req.body.ids });

    res.send({
      message: `Products Delete Successfully!`,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addProduct,
  addAllProducts,
  getAllProducts,
  getShowingProducts,
  getProductById,
  getProductBySlug,
  updateProduct,
  updateManyProducts,
  updateStatus,
  deleteProduct,
  deleteManyProducts,
  getShowingStoreProducts,
};