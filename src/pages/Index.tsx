import { BobWidget } from "@/components/BobWidget";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center max-w-2xl mx-auto px-4">
        <h1 className="mb-4 text-4xl font-bold">Bob Widget Demo</h1>
        <p className="text-xl text-muted-foreground mb-6">
          Testing ground for the CARFIX Bob assistant. Click the Bob icon in the bottom-right corner to start chatting!
        </p>
        <div className="bg-muted rounded-lg p-6 text-left">
          <h2 className="text-lg font-semibold mb-3">Features:</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>✓ Animated Bob character with multiple states</li>
            <li>✓ AI-powered chat using Lovable AI (Gemini)</li>
            <li>✓ Kiwi personality and auto parts expertise</li>
            <li>✓ Sentiment-based animations (happy/grump)</li>
            <li>✓ Streaming responses for natural conversation</li>
            <li>⏳ Future: ElevenLabs TTS integration</li>
            <li>⏳ Future: Supabase parts lookup</li>
          </ul>
        </div>
      </div>
      <BobWidget />
    </div>
  );
};

export default Index;
