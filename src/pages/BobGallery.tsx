import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";

const BobGallery = () => {
  const bobImages = [
    { 
      name: "Happy", 
      path: "/bob-animations/happy.png", 
      purpose: "Welcome, thank you, completing a sale, being happy/laughing"
    },
    { 
      name: "Idle", 
      path: "/bob-animations/idle.png", 
      purpose: "Default state - Anything else I can help with?"
    },
    { 
      name: "Thinking (1)", 
      path: "/bob-animations/thinking.png", 
      purpose: "Used in succession within Thinking or Researching state"
    },
    { 
      name: "Thinking (2)", 
      path: "/bob-animations/Bob thinking.png", 
      purpose: "Used in succession within Thinking or Researching state"
    },
    { 
      name: "Talk Small (1)", 
      path: "/bob-animations/talk-small.png", 
      purpose: "Used within conversational state of Bob's talking"
    },
    { 
      name: "Talk Small (2)", 
      path: "/bob-animations/Bob talk small.png", 
      purpose: "Used within conversational state of Bob's talking"
    },
    { 
      name: "Complete", 
      path: "/bob-animations/23628891-3eb9-40bf-b2f5-dda69129038a.png", 
      purpose: "Thank you, all done, great to see you come back soon"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Bob Animation Gallery</h1>
            <p className="text-muted-foreground">7 conversational state images for Bob</p>
          </div>
          <NavLink to="/">
            <Button>Back to Home</Button>
          </NavLink>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {bobImages.map((image) => (
            <div
              key={image.name}
              className="flex flex-col p-6 bg-card rounded-lg border border-border hover:border-primary transition-colors"
            >
              <div className="w-full aspect-square bg-muted rounded-md overflow-hidden mb-4 flex items-center justify-center">
                <img
                  src={image.path}
                  alt={image.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {image.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {image.purpose}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BobGallery;
