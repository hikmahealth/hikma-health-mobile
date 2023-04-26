import { ReactElement } from "react"

type Props = {
  condition: boolean
  children: ReactElement | ReactElement[]
}
export const If = ({ condition, children }: Props) => {
  if (condition === true) {
    return <>{children}</>
  }

  return null
}
