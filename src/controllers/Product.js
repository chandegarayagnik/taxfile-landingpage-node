import { dbConection } from "../config/db.js";

// CREATE / UPDATE Product
export const createOrUpdateProduct = async (req, res) => {
  const { flag, Master, price = [], content = [] } = req.body;
  const sequelize = await dbConection();
  const UserName = req.user?.UserName || "System";
  const IpAddress = req?.headers["x-forwarded-for"] || req?.socket?.remoteAddress || "Not Found";

  const transaction = await sequelize.transaction();

  try {
    if (flag === "U") {
      // Delete existing product data
      await sequelize.query(
        "DELETE FROM ProductMast WHERE ProductUkeyId = :ProductUkeyId",
        { replacements: { ProductUkeyId: Master.ProductUkeyId }, transaction }
      );
      await sequelize.query(
        "DELETE FROM ProductPricing WHERE ProductUkeyId = :ProductUkeyId",
        { replacements: { ProductUkeyId: Master.ProductUkeyId }, transaction }
      );
      await sequelize.query(
        "DELETE FROM ProductContent WHERE ProductUkeyId = :ProductUkeyId",
        { replacements: { ProductUkeyId: Master.ProductUkeyId }, transaction }
      );
    }

    // Insert into ProductMast
    await sequelize.query(
      `
      INSERT INTO ProductMast
      (ProductUkeyId, ProductName, ShortCode, CategoryId, SubUkeyId, Tagline1, Tagline2, IsActive, IsDeleted, HSNCode, OrderId, ProductWebsite, IpAddress, EntryDate, UserName, flag, crmProductUkeyId, ProductApp)
      VALUES
      (:ProductUkeyId, :ProductName, :ShortCode, :CategoryId, :SubUkeyId, :Tagline1, :Tagline2, :IsActive, :IsDeleted, :HSNCode, :OrderId, :ProductWebsite, :IpAddress, GETDATE(), :UserName, :flag, :crmProductUkeyId, :ProductApp)
      `,
      {
        replacements: {
          ProductUkeyId: Master.ProductUkeyId,
          ProductName: Master.ProductName,
          ShortCode: Master.ShortCode,
          CategoryId: String(Master.CategoryId),
          SubUkeyId: Master.SubUkeyId,
          Tagline1: Master.Tagline1,
          Tagline2: Master.Tagline2,
          IsActive: Master.IsActive,
          IsDeleted: Master.IsDeleted,
          HSNCode: Master.HSNCode,
          OrderId: String(Master.OrderId),
          ProductWebsite: Master.ProductWebsite,
          ProductApp: Master.ProductApp,
          IpAddress,
          UserName,
          flag,
          crmProductUkeyId: Master.crmProductUkeyId
        },
        transaction
      }
    );

    // Insert ProductPricing
    for (const p of price) {
      await sequelize.query(
        `
        INSERT INTO ProductPricing
        (PriceUkeyId, ProductUkeyId, SingleUser, MultiUser, UpdateSingle, Updatemulti, IsActive, IpAddress, EntryDate, UserName, flag, Title)
        VALUES
        (:PriceUkeyId, :ProductUkeyId, :SingleUser, :MultiUser, :UpdateSingle, :Updatemulti, :IsActive, :IpAddress, GETDATE(), :UserName, :flag, :Title)
        `,
        {
          replacements: {
            PriceUkeyId: p.PriceUkeyId,
            ProductUkeyId: p.ProductUkeyId,
            SingleUser: p.SingleUser,
            MultiUser: p.MultiUser,
            UpdateSingle: p.UpdateSingle,
            Updatemulti: p.Updatemulti,
            IsActive: p.IsActive,
            Title: p.Title,
            IpAddress,
            UserName,
            flag
          },
          transaction
        }
      );
    }

    // Insert ProductContent
    for (const c of content) {
      await sequelize.query(
        `
        INSERT INTO ProductContent
        (ContentUkeyId, ProductUkeyId, Details, IsActive, IpAddress, EntryDate, UserName, flag)
        VALUES
        (:ContentUkeyId, :ProductUkeyId, :Details, :IsActive, :IpAddress, GETDATE(), :UserName, :flag)
        `,
        {
          replacements: {
            ContentUkeyId: c.ContentUkeyId || '',
            ProductUkeyId: c.ProductUkeyId || '',
            Details: c.Details || '',
            IsActive: c.IsActive || '',
            IpAddress,
            UserName,
            flag
          },
          transaction
        }
      );
    }

    await transaction.commit();
    res.status(200).json({
      message: flag === "A" ? "Product added successfully" : "Product updated successfully",
      Success: true
    });
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    res.status(500).json({ error: err.message, Success: false });
  } finally {
    await sequelize.close();
  }
};

// GET Product List with optional filters and pagination
export const getProducts = async (req, res) => {
  const { ProductUkeyId, ProductName, Page, PageSize } = req.query;
  const sequelize = await dbConection();
  try {
    let query = `select pm.*,SubCateName, cm.CategoryName, dm.FileName, dm.DocUkeyId from ProductMast pm left join SubCateMast sm on sm.SubUkeyId=pm.SubUkeyId left join CategoryMast cm on cm.CategoryId = pm.CategoryId left join DocMast dm on dm.MasterUkeyId = pm.ProductUkeyId AND dm.FileType <> 'pdf' WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as totalCount FROM ProductMast pm WHERE 1=1`;
    const replacements = {};

    if (ProductUkeyId) {
      query += " AND pm.ProductUkeyId = :ProductUkeyId";
      countQuery += " AND pm.ProductUkeyId = :ProductUkeyId";
      replacements.ProductUkeyId = ProductUkeyId;
    }
    if (ProductName) {
      query += " AND pm.ProductName LIKE :ProductName";
      countQuery += " AND pm.ProductName LIKE :ProductName";
      replacements.ProductName = `%${ProductName}%`;
    }

    query += " ORDER BY pm.OrderId ASC";

    // total count
    const [countResult] = await sequelize.query(countQuery, { replacements });
    const totalCount = countResult[0]?.totalCount || 0;

    // pagination
    const pageNum = parseInt(Page, 10);
    const pageSizeNum = parseInt(PageSize, 10);
    if (!isNaN(pageNum) && !isNaN(pageSizeNum) && pageNum > 0 && pageSizeNum > 0) {
      const offset = (pageNum - 1) * pageSizeNum;
      query += " OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY";
      replacements.offset = offset;
      replacements.pageSize = pageSizeNum;
    }

    const [results] = await sequelize.query(query, { replacements });
    res.status(200).json({ data: results, totalCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    await sequelize.close();
  }
};

// GET Product by ID with child data (ProductPricing, ProductContent)
export const getProductById = async (req, res) => {
  const { ProductUkeyId } = req.params;

  if (!ProductUkeyId) {
    return res.status(400).json({ error: "ProductUkeyId is required" });
  }

  const sequelize = await dbConection();

  try {
    // Get Product Master data
    const [productResult] = await sequelize.query(
      "select pm.*,SubCateName, cm.CategoryName, dm.FileName, dm.DocUkeyId from ProductMast pm left join SubCateMast sm on sm.SubUkeyId=pm.SubUkeyId left join CategoryMast cm on cm.CategoryId = pm.CategoryId left join DocMast dm on dm.MasterUkeyId = pm.ProductUkeyId where ProductUkeyId = :ProductUkeyId",
      { replacements: { ProductUkeyId } }
    );

    if (!productResult || productResult.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = productResult[0];

    // Get ProductPricing child data
    const [pricingResult] = await sequelize.query(
      "SELECT * FROM ProductPricing WHERE ProductUkeyId = :ProductUkeyId ORDER BY EntryDate ASC",
      { replacements: { ProductUkeyId } }
    );

    // Get ProductContent child data
    const [contentResult] = await sequelize.query(
      "SELECT * FROM ProductContent WHERE ProductUkeyId = :ProductUkeyId ORDER BY EntryDate ASC",
      { replacements: { ProductUkeyId } }
    );
    
    // Get ProductContent child data
    const [brochureResult] = await sequelize.query(
      "SELECT FileType, DocUkeyId, FileName FROM DocMast WHERE MasterUkeyId = :ProductUkeyId and FileType = 'pdf' ORDER BY EntryDate ASC",
      { replacements: { ProductUkeyId } }
    );

    res.status(200).json({
      Master: product,
      price: pricingResult,
      content: contentResult,
      brochure: brochureResult[0],
      Success: true
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message, Success: false });
  } finally {
    await sequelize.close();
  }
};

// DELETE Product
export const deleteProduct = async (req, res) => {
  const { ProductUkeyId } = req.params;
  const sequelize = await dbConection();
  const transaction = await sequelize.transaction();

  try {
    // delete from child tables first
    await sequelize.query("DELETE FROM ProductPricing WHERE ProductUkeyId = :ProductUkeyId", { replacements: { ProductUkeyId }, transaction });
    await sequelize.query("DELETE FROM ProductContent WHERE ProductUkeyId = :ProductUkeyId", { replacements: { ProductUkeyId }, transaction });
    
    // delete from master
    const [result] = await sequelize.query("DELETE FROM ProductMast WHERE ProductUkeyId = :ProductUkeyId", { replacements: { ProductUkeyId }, transaction });

    await transaction.commit();
    res.status(200).json({ message: "Product deleted successfully", Success: true });
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    res.status(500).json({ error: err.message, Success: false });
  } finally {
    await sequelize.close();
  }
};
