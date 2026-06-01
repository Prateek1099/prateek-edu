import { getEcosystemPreference } from "@/app/actions/resources-actions";
import NavbarClient from "./NavbarClient";
import { prisma } from "@/lib/prisma";

export default async function Navbar() {
  const preference = await getEcosystemPreference();
  
  // Optionally fetch full board details for nicer labels, but we can do string manipulation
  let boardTitle = preference?.board;
  let qualTitle = preference?.qualification;
  
  if (preference) {
    const boardObj = await prisma.board.findUnique({
      where: { name: preference.board },
      include: { qualifications: true }
    });
    if (boardObj) {
      boardTitle = boardObj.title;
      const qualObj = boardObj.qualifications.find(q => q.name === preference.qualification);
      if (qualObj) {
        qualTitle = qualObj.title;
      }
    }
  }

  return (
    <NavbarClient 
      preference={preference ? { 
        ...preference, 
        boardTitle: boardTitle || preference.board,
        qualTitle: qualTitle || preference.qualification
      } : null} 
    />
  );
}
