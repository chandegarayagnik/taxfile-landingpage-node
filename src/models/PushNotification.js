import { DataTypes } from "sequelize";
import { dbConection } from "../config/db.js";

const sequelize = await dbConection();

const SubCategory = sequelize.define(
  "PushNotification",
  {
    SubscriptionID: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    Endpoint: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    P256dh: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    Auth: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    IsActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    CreatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    UpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "PushNotification",
    timestamps: false,
  }
);

export default SubCategory;
