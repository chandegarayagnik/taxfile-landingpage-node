import { DataTypes } from "sequelize";
import { dbConection } from "../config/db.js";

const sequelize = await dbConection();

const ProductMast = sequelize.define(
  "ProductMast",
  {
    ProductId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    ProductUkeyId: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    ProductName: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    crmProductUkeyId: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    ShortCode: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    CategoryId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    SubUkeyId: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    Tagline1: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    Tagline2: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    HSNCode: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    OrderId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    ProductWebsite: {
      type: DataTypes.STRING(1000),
      allowNull: false,
    },
    IpAddress: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    EntryDate: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    UserName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    flag: {
      type: DataTypes.STRING(4),
      allowNull: true,
    },
    ProductApp: {
      type: DataTypes.STRING,
      allowNull: true
    }
  },
  {
    tableName: "ProductMast",
    timestamps: false,
  }
);

export default ProductMast;
