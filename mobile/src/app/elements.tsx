import * as React from "react"

import { DataElementsGallery } from "@/components/data-elements"
import { ELEMENTS_BODY } from "@/components/data-elements-body"
import { ELEMENTS_FOOD } from "@/components/data-elements-food"
import { ELEMENTS_MOVE } from "@/components/data-elements-move"
import { ELEMENTS_PLAN } from "@/components/data-elements-plan"
import { TabScreen } from "@/components/tab-bar"

/* A hundred and fifty ways to draw a member's plan data, numbered for the
   user to pick from (12 Oct 2026): the first 50, then food, movement, body
   and labs, and plan and care. Not a product screen: reached from /demo. */

const MORE = [...ELEMENTS_FOOD, ...ELEMENTS_MOVE, ...ELEMENTS_BODY, ...ELEMENTS_PLAN]

export default function ElementsScreen() {
  return (
    <TabScreen tab="home" bare title="Data elements">
      <DataElementsGallery extra={MORE} />
    </TabScreen>
  )
}
