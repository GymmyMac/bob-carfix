import { useState, useEffect } from "react";
import { MobileBobCharacter } from "./MobileBobCharacter";
import { MobileProductColumn } from "./MobileProductColumn";
import { MobileChatDrawer } from "./MobileChatDrawer";
import { Message } from "@/hooks/useBobChat";
import { Product } from "@/types/product";
import { ServicePackage } from "@/types/servicePackage";
import { Vehicle } from "@/types/vehicle";
import { HighlightedProduct } from "@/hooks/useBobChat";
import bobBgWall from "@/assets/bob-bg-wall.png";

type PanelState = 'hidden' | 'loading' | 'transitioning' | 'visible';

interface MobileBobLayoutProps {
  currentImage: string;
  animationState: string;
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onInputFocus: () => void;
  onInputBlur: () => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
  isMuted?: boolean;
  onToggleMute?: () => void;
  isSpeaking?: boolean;
  products: Product[];
  servicePackages: ServicePackage[];
  highlightedPartType?: string | null;
  highlightedProduct?: HighlightedProduct | null;
  onProductClick?: (product: Product) => void;
  onPackageSelect?: (pkg: ServicePackage) => void;
  isResearching?: boolean;
  vehicle?: Vehicle | null;
  onChangeVehicle?: () => void;
}

export const MobileBobLayout = ({
  currentImage,
  animationState,
  messages,
  input,
  setInput,
  isLoading,
  onSend,
  onKeyPress,
  onInputFocus,
  onInputBlur,
  chatEndRef,
  isMuted,
  onToggleMute,
  isSpeaking,
  products,
  servicePackages,
  highlightedPartType,
  highlightedProduct,
  onProductClick,
  onPackageSelect,
  isResearching,
  vehicle,
  onChangeVehicle
}: MobileBobLayoutProps) => {
  const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;
  
  const [bobPosition, setBobPosition] = useState<'center' | 'left'>('center');
  const [panelState, setPanelState] = useState<PanelState>('hidden');
  
  const hasProducts = products.length > 0 || servicePackages.length > 0;
  
  useEffect(() => {
    if (isResearching && panelState !== 'loading' && panelState !== 'visible') {
      setPanelState('loading');
      if (bobPosition === 'center') {
        setBobPosition('left');
      }
    } else if (hasProducts && panelState !== 'visible') {
      if (bobPosition === 'center') {
        setBobPosition('left');
        setPanelState('transitioning');
        const timer = setTimeout(() => {
          setPanelState('visible');
        }, 400);
        return () => clearTimeout(timer);
      } else {
        setPanelState('visible');
      }
    } else if (!hasProducts && !isResearching && panelState !== 'hidden') {
      setPanelState('hidden');
      setBobPosition('center');
    }
  }, [hasProducts, isResearching, panelState, bobPosition]);

  const showProductColumn = panelState !== 'hidden';

  return (
    <div 
      className="fixed inset-0 overflow-hidden"
      style={{
        height: '100dvh',
        touchAction: 'manipulation'
      }}
    >
      {/* Background with conditional blur */}
      <div 
        className="absolute inset-0 z-0 transition-all duration-500 ease-out"
        style={{
          backgroundImage: `url(${bobBgWall})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          filter: showProductColumn 
            ? 'blur(12px) brightness(0.7)' 
            : 'blur(0px) brightness(1)',
          transform: 'scale(1.1)'
        }}
      />
      
      {/* Gradient overlay */}
      <div 
        className="absolute inset-0 z-[1]"
        style={{
          background: 'linear-gradient(to bottom, hsla(var(--background) / 0.3) 0%, hsla(var(--background) / 0.6) 100%)'
        }}
      />

      {/* Bob Character */}
      <MobileBobCharacter
        currentImage={currentImage}
        animationState={animationState}
        counterHeightPercent={22}
        scale={200}
        position={bobPosition}
      />

      {/* Vehicle Context Bar */}
      {vehicle && !isEmbedded && (
        <div className="absolute top-2 left-2 right-2 z-20">
          <div 
            className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 
                       border border-border shadow-lg flex items-center justify-between"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 4px) + 8px)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
              {vehicle.rego && (
                <p className="text-[10px] text-muted-foreground">
                  {vehicle.rego}
                </p>
              )}
            </div>
            {onChangeVehicle && (
              <button
                onClick={onChangeVehicle}
                className="text-xs text-primary hover:underline ml-2 shrink-0"
              >
                Change
              </button>
            )}
          </div>
        </div>
      )}

      {/* Product Column */}
      <MobileProductColumn
        products={products}
        servicePackages={servicePackages}
        highlightedPartType={highlightedPartType}
        highlightedProduct={highlightedProduct}
        onProductClick={onProductClick}
        onPackageSelect={onPackageSelect}
        isResearching={isResearching}
        visible={showProductColumn}
        counterHeightPercent={22}
        hasVehicle={!!vehicle}
      />

      {/* Chat Drawer */}
      <MobileChatDrawer
        messages={messages}
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        onSend={onSend}
        onKeyPress={onKeyPress}
        onInputFocus={onInputFocus}
        onInputBlur={onInputBlur}
        chatEndRef={chatEndRef}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        isSpeaking={isSpeaking}
      />
    </div>
  );
};
