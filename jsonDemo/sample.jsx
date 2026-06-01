import React from "react";

export default function Sample() {
  const data = { name: "react 示例", list: ["x", "y"] };
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
