import express from "express";
import familyController from "../controllers/familyController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/signup", familyController.signupFamily);

// Protected routes
router.post("/invite", authenticate, familyController.createInvite);
router.get("/my-codes", authenticate, familyController.getMyInviteCodes);
router.delete("/invite/:codeId", authenticate, familyController.deleteInviteCode);
router.patch("/invite/:codeId/deactivate", authenticate, familyController.deactivateInviteCode);
router.post("/link", authenticate, familyController.linkFamily);
router.get("/child-data", authenticate, familyController.getChildData);

export default router;
