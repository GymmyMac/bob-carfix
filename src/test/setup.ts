 /**
  * Vitest Test Setup
  * 
  * This file runs before each test file.
  * Add global mocks and test utilities here.
  */
 
 import "@testing-library/jest-dom";
 
 // Mock matchMedia for components that use media queries
 Object.defineProperty(window, "matchMedia", {
   writable: true,
   value: (query: string) => ({
     matches: false,
     media: query,
     onchange: null,
     addListener: () => {},
     removeListener: () => {},
     addEventListener: () => {},
     removeEventListener: () => {},
     dispatchEvent: () => false,
   }),
 });
 
 // Mock ResizeObserver
 class ResizeObserverMock {
   observe() {}
   unobserve() {}
   disconnect() {}
 }
 
 Object.defineProperty(window, "ResizeObserver", {
   writable: true,
   value: ResizeObserverMock,
 });
 
 // Mock IntersectionObserver
 class IntersectionObserverMock {
   observe() {}
   unobserve() {}
   disconnect() {}
 }
 
 Object.defineProperty(window, "IntersectionObserver", {
   writable: true,
   value: IntersectionObserverMock,
 });
 
 // Mock SpeechRecognition (for PTT tests)
 Object.defineProperty(window, "SpeechRecognition", {
   writable: true,
   value: undefined,
 });
 
 Object.defineProperty(window, "webkitSpeechRecognition", {
   writable: true,
   value: undefined,
 });