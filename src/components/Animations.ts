import { keyframes } from "styled-components";

export const pulseAnimation = keyframes`
  0%   { stroke-width: 1px; stroke-opacity: 0%; }
  50%  { stroke-opacity: 50% }
  99%  { stroke-width: 5px; stroke-opacity: 0%; }
  100% { stroke-width: 1px; stroke-opacity: 0%; }
`

export const blinkAnimation = keyframes`
  0% { opacity: 100% }
  50% { opacity: 50% }
  100% { opacity: 100% }
`