import { dbConection } from "../config/db.js";

// CREATE / UPDATE News
export const createNews = async (req, res) => {
  const {
    UkeyId, Title = "", Descrption = "", NewsDate = null, IsActive = true, IsDeleted = false, UserName = req.user?.UserName, flag = "A", Type = "", NewsCatUkeyId = '',
  } = req.body;

  const sequelize = await dbConection();

  try {
    const IpAddress = req?.headers["x-forwarded-for"] || req?.socket?.remoteAddress || "Not Found";

    let query = "";

    if (flag === "U") {
      query += `
        DELETE FROM NewsMast WHERE UkeyId = :UkeyId;
      `;
    }

    query += `
      INSERT INTO NewsMast
        (UkeyId, Title, Descrption, NewsDate, IsActive, IsDeleted, IpAddress, EntryDate, UserName, flag, Type, NewsCatUkeyId)
      VALUES
        (:UkeyId, :Title, :Descrption, :NewsDate, :IsActive, :IsDeleted, :IpAddress, GETDATE(), :UserName, :flag, :Type, :NewsCatUkeyId);
    `;

    await sequelize.query(query, {
      replacements: { Title, Descrption, NewsDate, IsActive, IsDeleted, IpAddress, UserName, flag, UkeyId, Type, NewsCatUkeyId },
    });

    res.status(200).json({
      message: flag === "A" ? "News created successfully" : "News updated successfully", Success : true
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message, Success : false });
  } finally {
    await sequelize.close();
  }
};

// CREATE / UPDATE News
export const updateCategoryStatus = async (req, res) => {
  const {
    UkeyId, NewsCatUkeyId = '',
  } = req.body;

  const sequelize = await dbConection();

  try {
    const IpAddress = req?.headers["x-forwarded-for"] || req?.socket?.remoteAddress || "Not Found";

    let query = "";

    query += `
      UPDATE NewsMast
        SET NewsCatUkeyId = :NewsCatUkeyId
        WHERE UkeyId = :UkeyId
    `;

    await sequelize.query(query, {
      replacements: { NewsCatUkeyId, UkeyId },
    });

    res.status(200).json({
      message: "Category status updated successfully", Success : true
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message, Success : false });
  } finally {
    await sequelize.close();
  }
};

// GET News (with optional filters and pagination)
export const getNews = async (req, res) => {
  const { UkeyId, Title, IsActive, IsDeleted, Page, PageSize, Type, NewsCatUkeyId } = req.query;
  const sequelize = await dbConection();

  try {
    let query = " SELECT nm.*, dm.FileName, dm.DocUkeyId, nc.NewsCategory FROM NewsMast nm left join DocMast dm on dm.MasterUkeyId = nm.UkeyId left join NewsCategory nc on nc.NewsCatUkeyId = nm.NewsCatUkeyId WHERE 1=1";
    let countQuery = "SELECT COUNT(*) as totalCount FROM NewsMast nm WHERE 1=1";
    const replacements = {};

    if (UkeyId) {
      query += " AND UkeyId = :UkeyId";
      countQuery += " AND UkeyId = :UkeyId";
      replacements.UkeyId = UkeyId;
    }
    if (Type) {
      query += " AND Type = :Type";
      countQuery += " AND Type = :Type";
      replacements.Type = Type;
    }
    if (Title) {
      query += " AND Title LIKE :Title";
      countQuery += " AND Title LIKE :Title";
      replacements.Title = `%${Title}%`;
    }
    if (IsActive) {
      query += " AND IsActive = :IsActive";
      countQuery += " AND IsActive = :IsActive";
      replacements.IsActive = IsActive;
    }
    if (IsDeleted) {
      query += " AND IsDeleted = :IsDeleted";
      countQuery += " AND IsDeleted = :IsDeleted";
      replacements.IsDeleted = IsDeleted;
    }
    if (NewsCatUkeyId) {
      query += " AND nc.NewsCatUkeyId = :NewsCatUkeyId";
      countQuery += " AND nc.NewsCatUkeyId = :NewsCatUkeyId";
      replacements.NewsCatUkeyId = NewsCatUkeyId;
    }

    // Always order by EntryDate DESC
    query += " ORDER BY NewsDate DESC";

    // Apply pagination if provided
    const pageNum = parseInt(Page, 10);
    const pageSizeNum = parseInt(PageSize, 10);

    const [CountResult] = await sequelize.query(query, { replacements });

    if (!isNaN(pageNum) && !isNaN(pageSizeNum) && pageNum > 0 && pageSizeNum > 0) {
      const offset = (pageNum - 1) * pageSizeNum;
      query += " OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY";
      replacements.offset = offset;
      replacements.pageSize = pageSizeNum;
    }

    const [results] = await sequelize.query(query, { replacements });
    res.status(200).json({data : results, totalCount: CountResult.length});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  } finally {
    await sequelize.close();
  }
};

// DELETE News
export const deleteNews = async (req, res) => {
  const { UkeyId } = req.params;
  const sequelize = await dbConection();

  try {
    const query = "DELETE FROM NewsMast WHERE UkeyId = :UkeyId";
    const result = await sequelize.query(query, { replacements: { UkeyId } });

    if (result[1] === 0) {
      return res.status(404).json({ error: "News record not found" });
    }

    res.status(200).json({ message: "News deleted successfully", Success : true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message, Success : false });
  } finally {
    await sequelize.close();
  }
};
