import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Rocket, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const LaunchSoon = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">

      <main className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-xl"
        >
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-accent to-primary text-white shadow-2xl mb-8"
          >
            <Rocket className="w-12 h-12" />
          </motion.div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Launch Soon
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Our Self-Paced Courses are launching soon. Stay tuned for an exciting and flexible learning experience!
          </p>
          <Button onClick={() => navigate("/")} variant="outline" size="lg">
            <ArrowLeft className="w-4 h-4" />
            Back to Welcome
          </Button>
        </motion.div>
      </main>
    </div>
  );
};

export default LaunchSoon;
