"use client";

import { motion, Variants } from "framer-motion";
import { useCards } from "@/hooks/useCards";
import { CardCarousel } from "@/components/cards/CardCarrousel";
import { CardForm } from "@/components/cards/CardForm";

export default function CardsPage() {
  const { cards, loading, form, handleSubmit } = useCards();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Cargando billetera...</div>;
  }

  return (
    <motion.div 
      className="p-6 pb-24 flex flex-col gap-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.header variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Billetera</h1>
        <p className="text-sm text-gray-500 mt-1">Gestioná tus tarjetas de crédito.</p>
      </motion.header>

      <CardCarousel 
        cards={cards} 
        itemVariants={itemVariants} 
        cardVariants={cardVariants} 
      />

      <CardForm 
        form={form} 
        handleSubmit={handleSubmit} 
        itemVariants={itemVariants} 
      />
    </motion.div>
  );
}