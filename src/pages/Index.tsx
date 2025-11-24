import { BobCharacter } from "@/components/BobCharacter";
import { ChatInterface } from "@/components/ChatInterface";
import { ProductShelf } from "@/components/ProductShelf";
import { useBobAnimation } from "@/hooks/useBobAnimation";
import { useBobChat } from "@/hooks/useBobChat";
import { PLACEHOLDER_PRODUCTS } from "@/types/product";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { animationState, setAnimationState, getCurrentImage, setTalkSpeed } = useBobAnimation();
  const {
    messages,
    input,
    setInput,
    isLoading,
    handleSend,
    handleKeyPress,
    handleInputFocus,
    handleInputBlur,
    chatEndRef
  } = useBobChat({ setAnimationState, setTalkSpeed });

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <div className="fixed top-4 right-4 z-50">
        <NavLink to="/bob-gallery">
          <Button variant="outline" size="sm">View Bob Gallery</Button>
        </NavLink>
      </div>

      {/* Desktop: Side-by-side layout */}
      <div className="hidden lg:grid lg:grid-cols-[40%_60%] min-h-screen">
        {/* Bob + Chat Area (Left) */}
        <div className="flex flex-col bg-muted/30 border-r border-border">
          <div className="flex items-center justify-center pt-8 px-8 flex-shrink-0">
            <BobCharacter 
              currentImage={getCurrentImage()}
              animationState={animationState}
            />
          </div>
          
          <div className="px-6 pb-8 pt-2">
            <ChatInterface
              messages={messages}
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              onSend={handleSend}
              onKeyPress={handleKeyPress}
              onInputFocus={handleInputFocus}
              onInputBlur={handleInputBlur}
              chatEndRef={chatEndRef}
            />
          </div>
        </div>

        {/* Product Shelf Area (Right) */}
        <div className="bg-background">
          <ProductShelf 
            products={PLACEHOLDER_PRODUCTS}
            onProductClick={(product) => console.log("Product clicked:", product)}
          />
        </div>
      </div>

      {/* Mobile/Tablet: Stacked layout */}
      <div className="lg:hidden">
        <div className="bg-muted/30 px-4">
          <div className="pt-12">
            <BobCharacter 
              currentImage={getCurrentImage()}
              animationState={animationState}
              className="max-w-sm mx-auto"
            />
          </div>
          
          <div className="pt-2 pb-8">
            <ChatInterface
              messages={messages}
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              onSend={handleSend}
              onKeyPress={handleKeyPress}
              onInputFocus={handleInputFocus}
              onInputBlur={handleInputBlur}
              chatEndRef={chatEndRef}
            />
          </div>
        </div>

        <div className="py-8">
          <ProductShelf 
            products={PLACEHOLDER_PRODUCTS}
            onProductClick={(product) => console.log("Product clicked:", product)}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
