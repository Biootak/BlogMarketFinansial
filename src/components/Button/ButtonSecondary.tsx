"use client";

import React, { type FC } from "react";
import Button, { type ButtonProps } from "./Button";

export interface Props extends ButtonProps {}

const ButtonSecondary: FC<Props> = (props) => {
  return <Button {...props} pattern="secondary" />;
};

export default ButtonSecondary;
