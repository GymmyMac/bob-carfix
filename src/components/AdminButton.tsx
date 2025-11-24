import { useState } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPanel } from "./AdminPanel";

export const AdminButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Shield className="w-4 h-4" />
        Admin Panel
      </Button>
      <AdminPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
