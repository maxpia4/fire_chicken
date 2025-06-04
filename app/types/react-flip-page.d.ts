declare module 'react-flip-page' {
  import { Component } from 'react';

  interface FlipPageProps {
    orientation?: 'horizontal' | 'vertical';
    style?: React.CSSProperties;
    showTouchHint?: boolean;
    flipOnTouch?: boolean;
    usePortrait?: boolean;
    children?: React.ReactNode;
  }

  export default class FlipPage extends Component<FlipPageProps> {}
} 