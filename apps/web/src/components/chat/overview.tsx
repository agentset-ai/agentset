import { useChatMessageCount } from "ai-sdk-zustand";
import { motion } from "framer-motion";

import { Logo } from "@agentset/ui";

export const Overview = ({
  message = "Welcome to the playground! You can try chatting with your data here.",
  logo,
}: {
  message?: string;
  logo?: string;
}) => {
  const messagesLength = useChatMessageCount();
  if (messagesLength > 0) return null;

  return (
    <motion.div
      key="overview"
      className="mx-auto mt-10 max-w-3xl md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="flex max-w-xl flex-col items-center gap-8 rounded-xl p-6 text-center leading-relaxed">
        {logo ? (
          <img
            src={logo}
            alt="Logo"
            className="size-15 rounded-md object-cover"
          />
        ) : (
          <Logo className="size-15" />
        )}

        <p>{message}</p>
      </div>
    </motion.div>
  );
};
