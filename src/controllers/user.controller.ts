import { UserModel } from "@models/user.model";
import * as userService from "@services/user.service";
import {
  STUDENT_ID_EXISTED_ERROR,
  UNEXPECTED_ERROR,
  UPDATE_USER_FAILED,
} from "@shared/constants";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { get } from "lodash";

interface UpdateProfileParams {
  firstName: string;
  lastName: string;
  studentId: string;
}

export const updateProfile = async (req: Request, res: Response) => {
  const { firstName, lastName, studentId } =
    req.body as unknown as UpdateProfileParams;
  const user = req.body.user as UserModel;
  const isStudentIdInvalid = await userService.isStudentIdInvalid(
    user,
    studentId
  );
  if (!isStudentIdInvalid) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: STUDENT_ID_EXISTED_ERROR });
  }
  const result = await userService.updateUser(user._id, {
    firstName,
    lastName,
    studentId,
    hasInputStudentId: true,
  });
  if (result) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...response } = result.toObject();
    return res.json(response);
  }
  res.status(StatusCodes.BAD_REQUEST).json({ message: UPDATE_USER_FAILED });
};

export const changePassword = async (req: Request, res: Response) => {
  const { newPassword, oldPassword } = req.body as unknown as {
    newPassword: string;
    oldPassword: string;
  };
  const user = req.body.user as UserModel;
  const isPasswordValid = userService.comparePassword(user, oldPassword);
  if (isPasswordValid) {
    const encryptPassword = userService.encryptPassword(newPassword);
    const result = await userService.updateUser(user._id, {
      password: encryptPassword,
    });
    return res.json(result);
  }
  res.status(StatusCodes.BAD_REQUEST).json({ message: UPDATE_USER_FAILED });
};

export const getUserById = async (req: Request, res: Response) => {
  const id = get(req.params, "id");
  const user = await userService.getUserById(id);
  if (user) {
    const objectUser = user.toObject();
    const { _id, firstName, lastName, studentId, email, username } = objectUser;
    return res.json({ _id, firstName, lastName, studentId, email, username });
  }
  res.status(StatusCodes.BAD_REQUEST).json({ message: UNEXPECTED_ERROR });
};

export const getUserByStudentId = async (req: Request, res: Response) => {
  const studentId = get(req.params, "studentId");
  const student = await userService.getStudentByStudentId(studentId);
  if (student) {
    return res.json(student);
  }
  res.status(StatusCodes.BAD_REQUEST).json({ message: UNEXPECTED_ERROR });
};
