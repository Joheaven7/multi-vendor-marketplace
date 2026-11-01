import { Router } from "express";
import * as usersController from "../controllers/users.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import { changePasswordSchema, updateProfileSchema } from "../validators/auth.validator";

const router = Router();

router.use(authenticate);

router.patch("/me", validate({ body: updateProfileSchema }), usersController.updateMe);
router.patch(
  "/me/password",
  validate({ body: changePasswordSchema }),
  usersController.changePassword,
);

export default router;