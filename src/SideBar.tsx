import { WiAlien } from 'react-icons/wi'
import { GrApple } from 'react-icons/gr'
import { FaBabyCarriage, FaBilibili, FaBong } from 'react-icons/fa6'
import React from 'react'

type IconType = React.ElementType

const SideBar = () => {
  return (
    <div className="fixed top-0 left-0 h-screen w-20 m-0 flex flex-col bg-gray-700 text-white-shadow-lg">
      <SideBarIcon icon={WiAlien}  />
      <SideBarIcon icon={GrApple} />
      <SideBarIcon icon={FaBabyCarriage} />
      <SideBarIcon icon={FaBilibili} />
      <SideBarIcon icon={FaBong} />
    </div>
  )
}

const SideBarIcon = ({ icon, text = 'Tooltip' }: { icon: IconType }) => {
  return (
    <div className="sidebar-icon group">
      {React.createElement(icon)}
      <span className="sidebar-tooltip group-hover:scale-100 ">{text}</span>
    </div>
  )
}

export default SideBar
