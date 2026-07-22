const router=require("express").Router();
const controller=require("../controllers/notificationController");
const {verifyToken}=require("../middlewares/auth.middleware");
router.use(verifyToken);
router.get("/",controller.list);
router.patch("/read-all",controller.readAll);
router.patch("/:id/read",controller.read);
module.exports=router;
