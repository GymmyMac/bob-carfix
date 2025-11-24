import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";

const BobGallery = () => {
  const bobImages = [
    // Core state images
    { name: "Idle", path: "/bob-animations/idle.png", category: "Core States" },
    { name: "Listening", path: "/bob-animations/listening.png", category: "Core States" },
    { name: "Thinking", path: "/bob-animations/thinking.png", category: "Core States" },
    { name: "Talk Small", path: "/bob-animations/talk-small.png", category: "Core States" },
    { name: "Talk Big", path: "/bob-animations/talk-big.png", category: "Core States" },
    { name: "Happy", path: "/bob-animations/happy.png", category: "Core States" },
    { name: "Grump", path: "/bob-animations/grump.png", category: "Core States" },
    
    // Blink sequence
    { name: "Blink Closing", path: "/bob-animations/idle-blink-closing.png", category: "Blink Sequence" },
    { name: "Blink Closed", path: "/bob-animations/idle-blink-closed.png", category: "Blink Sequence" },
    { name: "Blink Opening", path: "/bob-animations/idle-blink-opening.png", category: "Blink Sequence" },
    
    // Head turn sequence
    { name: "Head Slight Left", path: "/bob-animations/idle-head-slight-left.png", category: "Head Turn Sequence" },
    { name: "Head Left", path: "/bob-animations/idle-head-left.png", category: "Head Turn Sequence" },
    { name: "Head Center", path: "/bob-animations/idle-head-center.png", category: "Head Turn Sequence" },
    { name: "Head Slight Right", path: "/bob-animations/idle-head-slight-right.png", category: "Head Turn Sequence" },
    { name: "Head Right", path: "/bob-animations/idle-head-right.png", category: "Head Turn Sequence" },
    { name: "Head Return", path: "/bob-animations/idle-head-return.png", category: "Head Turn Sequence" },
    
    // Ear scratch sequence
    { name: "Ear Scratch 1", path: "/bob-animations/idle-ear-scratch-1.png", category: "Ear Scratch Sequence" },
    { name: "Ear Scratch 2", path: "/bob-animations/idle-ear-scratch-2.png", category: "Ear Scratch Sequence" },
    { name: "Ear Scratch 3", path: "/bob-animations/idle-ear-scratch-3.png", category: "Ear Scratch Sequence" },
    { name: "Ear Scratch 4", path: "/bob-animations/idle-ear-scratch-4.png", category: "Ear Scratch Sequence" },
    
    // Catalogue lookup
    { name: "Catalogue Lookup", path: "/bob-animations/idle-catalogue.png", category: "Special Actions" },
  ];

  const categories = Array.from(new Set(bobImages.map(img => img.category)));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Bob Animation Gallery</h1>
            <p className="text-muted-foreground">All 22 Bob animation images for review</p>
          </div>
          <NavLink to="/">
            <Button>Back to Home</Button>
          </NavLink>
        </div>

        {categories.map((category) => (
          <div key={category} className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-6 pb-2 border-b border-border">
              {category}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {bobImages
                .filter((img) => img.category === category)
                .map((image) => (
                  <div
                    key={image.name}
                    className="flex flex-col items-center p-4 bg-card rounded-lg border border-border hover:border-primary transition-colors"
                  >
                    <div className="w-full aspect-square bg-muted rounded-md overflow-hidden mb-3 flex items-center justify-center">
                      <img
                        src={image.path}
                        alt={image.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-sm font-medium text-foreground text-center">
                      {image.name}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BobGallery;
