import { useNavigate } from 'react-router-dom';
export const HorizontalNav = () => {
    const navigate = useNavigate();
    const navigateTo = (subpath) => {
        navigate(subpath)
    }
    return (
        <>
            <div className="max-w-2xl ml-auto">

                <nav className="border-gray-200">
                    <div className="container mx-auto flex flex-wrap items-center justify-between">
                        {/* <a href="#" className="flex">
                            <svg className="h-10 mr-3" width="51" height="70" viewBox="0 0 51 70" fill="none" xmlns="http://www.w3.org/2000/svg"><g clipPath="url(#clip0)"><path d="M1 53H27.9022C40.6587 53 51 42.7025 51 30H24.0978C11.3412 30 1 40.2975 1 53Z" fill="#76A9FA"></path><path d="M-0.876544 32.1644L-0.876544 66.411C11.9849 66.411 22.4111 55.9847 22.4111 43.1233L22.4111 8.87674C10.1196 8.98051 0.518714 19.5571 -0.876544 32.1644Z" fill="#A4CAFE"></path><path d="M50 5H23.0978C10.3413 5 0 15.2975 0 28H26.9022C39.6588 28 50 17.7025 50 5Z" fill="#1C64F2"></path></g><defs><clipPath id="clip0"><rect width="51" height="70" fill="white"></rect></clipPath></defs></svg>
                            <span className="self-center text-lg font-semibold whitespace-nowrap">FlowBite</span>
                        </a> */}
                       
                        <div className="hidden md:block w-full md:w-auto" id="mobile-menu">
                            <ul className="flex-col md:flex-row flex md:space-x-8 mt-4 md:mt-0 md:text-m md:font-medium">
                                <li>
                                    <p onClick={() => { navigateTo("/home") }} className="cursor-pointer bg-blue-700 md:bg-transparent text-white block pl-3 pr-4 py-2 md:text-blue-700 md:p-0 rounded focus:outline-none" aria-current="page">
                                        Home
                                    </p>
                                </li>
                                {/* <li>
                                    <button id="dropdownNavbarLink" data-dropdown-toggle="dropdownNavbar" className="text-gray-700 hover:bg-gray-50 border-b border-gray-100 md:hover:bg-transparent md:border-0 pl-3 pr-4 py-2 md:hover:text-blue-700 md:p-0 font-medium flex items-center justify-between w-full md:w-auto">Dropdown </button>
                                    <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                                   
                                </li> */}
                                <li>
                                    <a href="#" className="text-gray-700 hover:bg-gray-50 border-b border-gray-100 md:hover:bg-transparent md:border-0 block pl-3 pr-4 py-2 md:hover:text-blue-700 md:p-0">Profle</a>
                                </li>
                                <li>
                                    <a href="#" className="text-gray-700 hover:bg-gray-50 border-b border-gray-100 md:hover:bg-transparent md:border-0 block pl-3 pr-4 py-2 md:hover:text-blue-700 md:p-0">Setting</a>
                                </li>
                                <li>
                                    <a href="#" className="text-gray-700 hover:bg-gray-50 border-b border-gray-100 md:hover:bg-transparent md:border-0 block pl-3 pr-4 py-2 md:hover:text-blue-700 md:p-0">Contact</a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </nav>

            </div>

        </>
    )
}
