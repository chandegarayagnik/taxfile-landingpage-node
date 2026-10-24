import express from "express";
import userRoutes from "./userRoutes.js";
import carouselRoutes from "./carouselRoutes.js";
import docMastRoutes from "./docMast.js";
import SubCategory from './subCategory.js';
import faqRoutes from './faqRoutes.js';
import YTvideoRoutes from './YTvideoRoutes.js';
import AboutUsRoutes from './AboutUsRoutes.js';
import NewsRoutes from './NewsRoutes.js';
import TeamRoutes from './TeamRoutes.js'
import clientRoutes from './clientRoutes.js';
import productRoutes from './productRoutes.js';
import vacancyRoutes from './vacancyRoutes.js';
import branchRoutes from './branchRoutes.js';
import InqueryRoutes from './InqueryRoutes.js';
import ImpDatesRoutes from './ImpDatesRoutes.js';
import CategoryRoutes from './category.js';
import VacancyApplyRoutes from "./VacencyApplyRoutes.js";
import OTPController from '../controllers/OTP.js';
import textContentRouters from './TextContents.js'; 
import EmpSettingRouters from "./EmpSetting.js";
import NewsLetterRouters from './newsLSubscriber.js';
import ContentMastRouter from './ContentMastRouter.js';
import ComplaintMast from "./ComplaintRoutes.js";
import PartyRoutes from "./PartyRoutes.js";
import location from './locationRoutes.js';
import mstCategory from './mst_CategoryRoutes.js'
import mstForms from './mst_FormsRoutes.js';
import PartyGroupRoutes from './PartyGroupRoutes.js';
import AreaRoutes from './AreaRoutes.js';
import DesignationRoutes from './DesignationRoutes.js';
import autoUpdateHistory from './autoUpdateHistory.js';
import whatsNew from './whatsNew.js';
import pastProduct from './pastProductRoutes.js';
import birthdayController from './BirthdayRoutes.js';
import relationRoutes from './relationRouter.js';
import DealerRoutes from './DealerRoutes.js';
import DealerSectionRoutes from './DealerSectionRoutes.js';
import DealerLevelRoutes from './DealerLevelRoutes.js';
import DealerCustomCommissionRoutes from './DealerCustomCommissionRoutes.js';
import ProductCommissionRoutes from './ProductCommissionRoutes.js';
import ProductCategoryCommission from './ProductCategoryCommissionRoutes.js';
import TransactionRoutes from './transactionRoutes.js';
import Payout from "./payout.js";
import emailMast from "./emailRoutes.js"
import {dashboardList} from '../controllers/dashboard.js';
import blogCategory from '../routers/blogCategoryRouter.js'
import Notification from '../routers/Notification.js'

const router = express.Router();

router.use("/users", userRoutes);
router.use("/carousel", carouselRoutes);
router.use("/documents", docMastRoutes);
router.use("/subcategory", SubCategory);
router.use("/faqs", faqRoutes);
router.use("/ytvideos", YTvideoRoutes);
router.use("/aboutus", AboutUsRoutes);
router.use("/news", NewsRoutes);
router.use("/team", TeamRoutes);
router.use("/clients", clientRoutes);
router.use("/product", productRoutes);
router.use("/vacancy", vacancyRoutes);
router.use("/branch", branchRoutes);
router.use("/inquiries", InqueryRoutes);
router.use("/impdates", ImpDatesRoutes);
router.use("/category", CategoryRoutes);
router.use('/vacencyApply', VacancyApplyRoutes);
router.use('/textContents', textContentRouters);
router.use('/empSetting', EmpSettingRouters);
router.use('/newsLetter', NewsLetterRouters);
router.use('/content', ContentMastRouter);
router.use('/complaint', ComplaintMast);
router.use('/party', PartyRoutes);
router.use('/location', location);
router.use('/mstCategory', mstCategory);
router.use('/mstForms', mstForms);
router.use('/partyGroup', PartyGroupRoutes);
router.use('/area', AreaRoutes);
router.use('/designation', DesignationRoutes);
router.use('/autoUpdateHistory', autoUpdateHistory);
router.use('/pastProduct', pastProduct);
router.use('/whatsNew', whatsNew);
router.use('/birthday', birthdayController);
router.use('/relation', relationRoutes);
router.use('/dealer', DealerRoutes);
router.use('/dealerSection', DealerSectionRoutes);
router.use('/dealerLevel', DealerLevelRoutes);
router.use('/productcatcom', ProductCategoryCommission);
router.use('/dealerCustomCommission', DealerCustomCommissionRoutes);
router.use('/productCommission', ProductCommissionRoutes);
router.use('/transaction', TransactionRoutes);
router.use('/payout', Payout)
router.use('/email', emailMast)
router.get('/sendOTP/:MobileNumber', OTPController);
router.get('/dashboard', dashboardList);
router.use('/blogCategory', blogCategory);

//USING TAX CRM NOTIFICATION API
router.use('/notification', Notification);



export default router;