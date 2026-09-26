import fs from "fs";
import path from "path";
import { dbConection } from "../config/db.js";

// Create Carousel
export const createDoc = async (req, res) => {
  const { Master = '', MasterUkeyId = '', Link = '', IsActive = '', UserName = '', FileType = '', flag = "A", Message = '', CustomerID = '', FileSize = '' } = req.body;
  const FileNames = req.files?.FileName?.map(file => file.filename) || [];

  const sequelize = await dbConection();
  const transaction = await sequelize.transaction(); // start transaction

  try {
    if (!FileNames.length) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const IpAddress =
      req?.headers["x-forwarded-for"] || req?.socket?.remoteAddress || "Not Found";

    let query = "", replacements = {};

    FileNames.forEach((file, idx) => {
      query += `
        INSERT INTO DocMast 
        (DocUkeyId, FileName, FileType, Master, MasterUkeyId, Link, IsActive, IpAddress, EntryDate, UserName, flag, Message, CustomerID, FileSize)
        VALUES (newid(), :FileName${idx}, :FileType, :Master, :MasterUkeyId, :Link, :IsActive, :IpAddress, GETDATE(), :UserName, :flag, :Message, :CustomerID, :FileSize);
      `;

      replacements[`FileName${idx}`] = file;
    });

    Object.assign(replacements, {
      Master, MasterUkeyId, Link, IsActive, UserName, flag, IpAddress, FileType, Message, CustomerID, FileSize
    });

    await sequelize.query(query, { replacements, transaction });

    await transaction.commit();

    res.status(200).json({
      message: "Docs created successfully",
      inserted: FileNames.length,
      Success: true
    });
  } catch (err) {
    console.error("Error inserting docs:", err);

    // Rollback transaction if error
    if (transaction) await transaction.rollback();

    // Delete uploaded files if DB insert fails
    if (FileNames.length > 0) {
      FileNames.forEach(async (file) => {
        try {
          await fs.unlinkSync('./media/Gallery/' + file);
        } catch (unlinkErr) {
          console.error("Error deleting file:", unlinkErr);
        }
      });
    }

    res.status(500).json({ error: err.message, Success: true });
  } finally {
    await sequelize.close();
  }
};

// Update Carousel
export const updateDoc = async (req, res) => {
  const {
    DocUkeyId = '', Master = '', MasterUkeyId = '', Link = '', IsActive = '', UserName = req.user?.UserName, FileType, flag = "U", Message = '', CustomerID = '', FileSize = ''
  } = req.body;

  const sequelize = await dbConection();

  try {
    const IpAddress =
      req?.headers["x-forwarded-for"] || req?.socket?.remoteAddress || "Not Found";

    // get old doc
    const [oldDoc] = await sequelize.query(
      "SELECT FileName FROM DocMast WHERE DocUkeyId = :DocUkeyId",
      {
        replacements: { DocUkeyId, FileType },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // ensure one new file uploaded
    // if (!req.files?.FileName || req.files.FileName.length === 0) {
    //   return res.status(400).json({ error: "No file uploaded for update" });
    // }

    const newFile = req.files.FileName?.[0]?.filename || req?.body?.FileName;

    // delete old DB row
    // await sequelize.query(
    //   "DELETE FROM DocMast WHERE DocUkeyId = :DocUkeyId and FileType = :FileType",
    //   { replacements: { DocUkeyId, FileType } }
    // );

    // update existing doc
    await sequelize.query(
      `UPDATE DocMast SET
          FileName = :FileName, 
          Master = :Master, 
          MasterUkeyId = :MasterUkeyId, 
          Link = :Link, 
          IsActive = :IsActive, 
          IpAddress = :IpAddress, 
          EntryDate = GETDATE(), 
          UserName = :UserName, 
          Message = :Message,
          flag = :flag,
          FileType = :FileType,
          CustomerID = :CustomerID,
          FileSize = :FileSize
        WHERE DocUkeyId = :DocUkeyId`,
      {
        replacements: {
          DocUkeyId,
          FileName: newFile || "",
          FileType: FileType || "",
          Master,
          MasterUkeyId,
          Link,
          IsActive,
          IpAddress,
          UserName,
          flag,
          Message,
          CustomerID,
          FileSize
        },
      }
    );

    // delete old file if exists
    if (req?.files?.FileName && !req?.body?.FileName) {
      if (oldDoc?.FileName.length > 0) {
        await fs.unlinkSync("./media/" + req?.params?.Master + "/" + oldDoc?.FileName);
      }
    }

    res.status(200).json({
      message: "Document updated successfully",
      updatedFile: newFile,
      Success: true
    });
  } catch (err) {
    console.error("Error updating document:", err);
    res.status(500).json({ error: err.message, Success: false });
  } finally {
    await sequelize.close();
  }
};

// Get AdminLogin (with optional filters)
export const getdoc = async (req, res) => {
  const { DocUkeyId, FileType, Master, MasterUkeyId, Link, IsActive, UserName, Page, PageSize, CustomerID, FileSize } = req.query;
  const sequelize = await dbConection();

  try {
    let query = "SELECT dm.*, pm.ProductName FROM DocMast dm left join ProductMast pm on dm.MasterUkeyId = pm.ProductUkeyId WHERE 1=1";
    let countQuery = "SELECT COUNT(*) as totalCount FROM DocMast dm WHERE 1=1";
    const replacements = {};

    if (DocUkeyId) {
      query += " AND dm.DocUkeyId = :DocUkeyId";
      countQuery += " AND dm.DocUkeyId = :DocUkeyId";
      replacements.DocUkeyId = DocUkeyId;
    }
    if (FileSize) {
      query += " AND dm.FileSize = :FileSize";
      countQuery += " AND dm.FileSize = :FileSize";
      replacements.FileSize = FileSize;
    }
    if (CustomerID) {
      query += " AND dm.CustomerID = :CustomerID";
      countQuery += " AND dm.CustomerID = :CustomerID";
      replacements.CustomerID = CustomerID;
    }
    if (FileType) {
      query += " AND dm.FileType = :FileType";
      countQuery += " AND dm.FileType = :FileType";
      replacements.FileType = FileType;
    }
    if (Master) {
      query += " AND dm.Master = :Master";
      countQuery += " AND dm.Master = :Master";
      replacements.Master = Master;
    }
    if (IsActive !== undefined) {
      query += " AND dm.IsActive = :IsActive";
      countQuery += " AND dm.IsActive = :IsActive";
      replacements.IsActive = IsActive;
    }
    if (MasterUkeyId) {
      query += " AND dm.MasterUkeyId = :MasterUkeyId";
      countQuery += " AND dm.MasterUkeyId = :MasterUkeyId";
      replacements.MasterUkeyId = MasterUkeyId;
    }
    if (UserName) {
      query += " AND dm.UserName = :UserName";
      countQuery += " AND dm.UserName = :UserName";
      replacements.UserName = UserName;
    }
    if (Link) {
      query += " AND dm.Link = :Link";
      countQuery += " AND dm.Link = :Link";
      replacements.Link = Link;
    }

    // Always order by EntryDate DESC
    query += " ORDER BY EntryDate DESC";

    // Apply pagination if provided
    const pageNum = parseInt(Page, 10);
    const pageSizeNum = parseInt(PageSize, 10);

    if (!isNaN(pageNum) && !isNaN(pageSizeNum) && pageNum > 0 && pageSizeNum > 0) {
      const offset = (pageNum - 1) * pageSizeNum;
      query += " OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY";
      replacements.offset = offset;
      replacements.pageSize = pageSizeNum;
    }

    // Get total count
    const [countResult] = await sequelize.query(countQuery, { replacements });
    const totalCount = countResult[0]?.totalCount || 0;

    const [results] = await sequelize.query(query, { replacements });

    res.status(200).json({ data: results, totalCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  } finally {
    await sequelize.close();
  }
};

// Delete Carousel
export const deleteDoc = async (req, res) => {
  const { DocUkeyId } = req.params;
  const sequelize = await dbConection();

  try {
    // 1. Get document info from DB
    const [doc] = await sequelize.query(
      "SELECT FileName, Master FROM DocMast WHERE DocUkeyId = :DocUkeyId",
      {
        replacements: { DocUkeyId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    // 3. Delete file if exists
    if (doc.FileName) {
      await fs.unlinkSync(`./media/${doc.Master}/${doc.FileName}`);
    }

    // 4. Delete record from DB
    await sequelize.query(
      "DELETE FROM DocMast WHERE DocUkeyId = :DocUkeyId",
      { replacements: { DocUkeyId } }
    );

    res.status(200).json({ message: "Document deleted successfully", Success: true });
  } catch (err) {
    console.error("Error deleting document:", err);
    res.status(500).json({ error: err.message, Success: false });
  } finally {
    await sequelize.close();
  }
};