import { Layout } from './components/Layout';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Layout />
      <Toaster position="top-right" />
    </>
  );
}

export default App;
