import styled from 'styled-components';
import { useTheme } from '../theme-provider';

const Loader = () => {
  const { theme } = useTheme();
  
  return (
    <StyledWrapper $theme={theme}>
      <div className="spinner">
        <div className="spinner1" />
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div<{ $theme: string }>`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30px; /* Add padding to prevent cropping of shadow/blur effects */
  
  .spinner {
    background-image: linear-gradient(rgb(255, 19, 55) 35%,rgb(255, 0, 98));
    width: 60px;
    height: 60px;
    animation: spinning82341 1.7s linear infinite;
    text-align: center;
    border-radius: 30px;
    filter: blur(1px);
    box-shadow: 0px -5px 15px 0px rgb(255, 19, 55), 0px 5px 15px 0px rgb(255, 0, 98);
  }

  .spinner1 {
    background-color: var(--background);
    width: 60px;
    height: 60px;
    border-radius: 30px;
    filter: blur(8px);
  }

  @keyframes spinning82341 {
    to {
      transform: rotate(360deg);
    }
  }`;

export default Loader;
