import { dbConection } from "../config/db.js";

export const getBlogCategory = async (req, res) => {
  const { NewsCatUkeyId, NewsCategory, IsActive, IsDeleted, Page, PageSize } = req.query;
  const sequelize = await dbConection();

  try {
    let query = `SELECT * FROM NewsCategory WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) AS totalCount FROM NewsCategory WHERE 1=1`;
    const replacements = {};

    // 🔍 Filters
    if (NewsCatUkeyId) {
      query += " AND NewsCatUkeyId = :NewsCatUkeyId";
      countQuery += " AND NewsCatUkeyId = :NewsCatUkeyId";
      replacements.NewsCatUkeyId = NewsCatUkeyId;
    }

    if (NewsCategory) {
      query += " AND NewsCategory = :NewsCategory";
      countQuery += " AND NewsCategory = :NewsCategory";
      replacements.NewsCategory = NewsCategory;
    }

    if (IsActive) {
      query += " AND IsActive = :IsActive";
      countQuery += " AND IsActive = :IsActive";
      replacements.IsActive = IsActive 
    }

    if (IsDeleted) {
      query += " AND IsDeleted = :IsDeleted";
      countQuery += " AND IsDeleted = :IsDeleted";
      replacements.IsDeleted = IsDeleted;
    }

    // 📊 Get total count
    const [countResult] = await sequelize.query(countQuery, { replacements });
    const totalCount = countResult[0]?.totalCount || 0;

    // 📄 Sorting (latest first)
    query += " ORDER BY NewsCatId DESC";

    // ⏩ Pagination
    const pageNum = parseInt(Page, 10);
    const pageSizeNum = parseInt(PageSize, 10);
    if (!isNaN(pageNum) && !isNaN(pageSizeNum) && pageNum > 0 && pageSizeNum > 0) {
      const offset = (pageNum - 1) * pageSizeNum;
      query += " OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY";
      replacements.offset = offset;
      replacements.pageSize = pageSizeNum;
    }

    // 📦 Fetch results
    const [results] = await sequelize.query(query, { replacements });

    res.status(200).json({
      data: results,
      totalCount,
      Success: true,
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: err.message, Success: false });
  } finally {
    await sequelize.close();
  }
};

export const createOrUpdateBlogCategory = async (req, res) => {
  const { NewsCategory, NewsCatUkeyId, IsDeleted = false, IsActive, flag, UserName = req.user?.UserName || "System", } = req.body;
  const sequelize = await dbConection();

  try {

    if (flag === "U") {
      await sequelize.query(
        `update NewsCategory set 
        NewsCategory = :NewsCategory,
        IsActive = :IsActive,
        IsDeleted = :IsDeleted,
        EntryTime = GETDATE(),
        flag = :flag,
        UserName = :UserName
        WHERE NewsCatUkeyId = :NewsCatUkeyId`,
        { replacements: { NewsCategory, IsActive, NewsCatUkeyId, IsDeleted, flag, UserName } }
      );
    } else {
      await sequelize.query(
        `INSERT INTO NewsCategory (NewsCategory, IsActive, NewsCatUkeyId, IsDeleted, EntryTime, flag, UserName)
         VALUES (:NewsCategory, :IsActive, :NewsCatUkeyId, :IsDeleted, GETDATE(), :flag, :UserName)`,
        { replacements: { NewsCategory, IsActive, NewsCatUkeyId, IsDeleted, flag, UserName } }
      );
    }

    res.status(200).json({
      message: flag === "A" ? "Blog Category created successfully" : "Blog Category updated successfully",
      Success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message, Success: false });
  }finally {
    await sequelize.close();
  }
};

export const deleteBlogCategory = async (req, res) => {
  const { NewsCatUkeyId } = req.params;
  const sequelize = await dbConection();
  try{
      const [existingNews] = await sequelize.query(
        `
            select Id from NewsMast
            WHERE NewsCatUkeyId = :NewsCatUkeyId
        `,
        { replacements: {  NewsCatUkeyId } }
      );

      if (existingNews.length > 0) {
        return res.status(400).json({
          message: "Cannot delete record because it is being used.",
          Success: false,
        });
      }

      await sequelize.query(
        `
            update NewsCategory set
            IsDeleted = 1
            WHERE NewsCatUkeyId = :NewsCatUkeyId
        `,
        { replacements: {  NewsCatUkeyId } }
      );
    res.status(200).json({
      message: "Blog Category deleted successfully",
      Success: true,
    });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: err.message, Success: false });
  }finally {
    await sequelize.close();
  }
}