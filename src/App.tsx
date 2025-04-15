
import './App.css'
import StakeForm from './components/StakeForm'

function App() {

  return (
    <div className=' h-screen flex justify-center items-center outfit-font'>
      <div className=" ">
        {/* Background elements */}
        <div className="swell-bg">
          <div className="swell-grid" />
          <div className="glow-effect glow-1" />
          <div className="glow-effect glow-2" />
        </div>

        <StakeForm />
      </div>

    </div>
  )
}

export default App
