import { UserModel } from "@models/user.model";
import * as RefreshTokenService from "@services/refresh-token.service";
import * as userService from "@services/user.service";
import {
  JWT_KEY,
  REFRESH_TOKEN_MESSAGE,
  UNAUTHORIZE_MESSAGE,
} from "@shared/constants";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { get } from "lodash";

export const checkAuthentication = async (req: Request, res: Response) => {
  const user = req.body.user as UserModel;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...response } = user.toObject();
  res.json(response);
};

const cookieOptions = (isHttps: boolean) => {
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? ("none" as const) : ("lax" as const),
  };
};

export const login = async (req: Request, res: Response) => {
  const user = req.body.user as UserModel;
  const rememberMe = get(req.body, "rememberMe");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...response } = user.toObject();
  const isHttps = req.protocol === "https";

  const accessToken = RefreshTokenService.createNewAccessToken(user.id);
  let refreshToken = null;
  if (rememberMe) {
    refreshToken = await RefreshTokenService.createNewRefreshToken(user.id);
  }

  const jwtPayload = RefreshTokenService.prepareCookiesPayload(
    accessToken,
    refreshToken
  );
  res.clearCookie(JWT_KEY, cookieOptions(isHttps));
  res.cookie(JWT_KEY, jwtPayload, cookieOptions(isHttps));
  res.json(response);
};

export const registerUser = async (req: Request, res: Response) => {
  const user = req.body as unknown as UserModel;
  const validationResult = await userService.validateNewUser(user);
  if (validationResult) {
    return res.status(StatusCodes.BAD_REQUEST).json(validationResult);
  }
  const result = await userService.createUser({
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    password: user.password,
  } as UserModel);
  res.json({ _id: result._id });
};

export const googleLogin = async (req: Request, res: Response) => {
  const user = req.body.user as UserModel;
  const isHttps = req.protocol === "https";
  const accessToken = RefreshTokenService.createNewAccessToken(user.id);
  const refreshToken = await RefreshTokenService.createNewRefreshToken(user.id);
  const jwtPayload = RefreshTokenService.prepareCookiesPayload(
    accessToken,
    refreshToken
  );
  res.clearCookie(JWT_KEY, cookieOptions(isHttps));
  res.cookie(JWT_KEY, jwtPayload, cookieOptions(isHttps));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...response } = user.toObject();
  res.json(response);
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    if (req.cookies && req.cookies[JWT_KEY]) {
      const jwtPayload = req.cookies[JWT_KEY];
      const { refreshToken } = RefreshTokenService.parseToken(jwtPayload);
      const tokens = await RefreshTokenService.performRefreshToken(
        refreshToken
      );
      if (tokens) {
        const { accessToken, refreshToken } = tokens;
        const newJwtPayload = RefreshTokenService.prepareCookiesPayload(
          accessToken,
          refreshToken
        );
        const isHttps = req.protocol === "https";

        res.clearCookie(JWT_KEY, cookieOptions(isHttps));
        res.cookie(JWT_KEY, newJwtPayload, cookieOptions(isHttps));
        return res.json({ message: REFRESH_TOKEN_MESSAGE });
      }
      return res.status(StatusCodes.UNAUTHORIZED).send(UNAUTHORIZE_MESSAGE);
    }
    return res.status(StatusCodes.UNAUTHORIZED).send(UNAUTHORIZE_MESSAGE);
  } catch (err) {
    console.error(err);
    return res.status(StatusCodes.UNAUTHORIZED).send(UNAUTHORIZE_MESSAGE);
  }
};

export const logout = async (req: Request, res: Response) => {
  const isHttps = req.protocol === "https";
  res.clearCookie(JWT_KEY, cookieOptions(isHttps));
  res.status(StatusCodes.OK).send("OK");
};
