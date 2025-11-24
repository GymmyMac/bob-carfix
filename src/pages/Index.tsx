import { BobCharacter } from "@/components/BobCharacter";
import { ChatInterface } from "@/components/ChatInterface";
import { ProductShelf } from "@/components/ProductShelf";
import { useBobAnimation } from "@/hooks/useBobAnimation";
import { useBobChat } from "@/hooks/useBobChat";
import { PLACEHOLDER_PRODUCTS } from "@/types/product";

const Index = () => {
  const { animationState, setAnimationState, getCurrentImage } = useBobAnimation();
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
  } = useBobChat({ setAnimationState });

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop: Side-by-side layout */}
      <div className="hidden lg:grid lg:grid-cols-[35%_65%] min-h-screen">
        {/* Bob Area */}
        <div className="flex items-center justify-center p-8 bg-muted/30 border-r border-border">
          <BobCharacter 
            currentImage={getCurrentImage()}
            animationState={animationState}
          />
        </div>

        {/* Product Shelf Area */}
        <div className="bg-background">
          <ProductShelf 
            products={PLACEHOLDER_PRODUCTS}
            onProductClick={(product) => console.log("Product clicked:", product)}
          />
        </div>
      </div>

      {/* Mobile/Tablet: Stacked layout */}
      <div className="lg:hidden">
        <div className="bg-muted/30 py-12 px-4">
          <BobCharacter 
            currentImage={getCurrentImage()}
            animationState={animationState}
            className="max-w-sm mx-auto"
          />
        </div>

        <div className="py-8">
          <ProductShelf 
            products={PLACEHOLDER_PRODUCTS}
            onProductClick={(product) => console.log("Product clicked:", product)}
          />
        </div>
      </div>

      {/* Chat Interface - Full width at bottom on all screens */}
      <div className="py-8 bg-muted/20">
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
  );
};

export default Index;
