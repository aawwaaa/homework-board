import { Statistics } from "./Statistics";

const tools = {
  "/statistics": () => <Statistics />,
};

export const ToolPage = ({ left }) => {
  return tools[left]();
};
