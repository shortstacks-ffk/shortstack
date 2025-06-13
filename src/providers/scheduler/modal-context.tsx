"use client";

import React, { createContext, useContext, useState } from "react";

// Update the interface to accept either a function or direct data
interface ModalContextType {
  data: Record<string, any>;
  isOpen: Record<string, boolean>;
  canClose: Record<string, boolean>;
  setCanClose: (modalId: string, canClose: boolean) => void;
  setOpen: (
    modal: React.ReactNode,
    fetchdata?: (() => Promise<any>) | any,
    modalId?: string
  ) => void;
  setClose: (modalId?: string) => void;
}

export const ModalContext = createContext<ModalContextType>({
  data: {},
  isOpen: {},
  canClose: {},
  setOpen: () => {},
  setClose: () => {},
  setCanClose: () => {},
});

interface ModalProviderProps {
  children: React.ReactNode;
}

const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState<Record<string, boolean>>({});
  const [data, setData] = useState<Record<string, any>>({});
  const [modals, setModals] = useState<Record<string, React.ReactNode>>({});
  const [canClose, setCanCloseState] = useState<Record<string, boolean>>({});

  const setOpen = async (
    modal: React.ReactNode,
    fetchdata?: (() => Promise<any>) | any,
    modalId: string = "default"
  ) => {
    try {
      let fetchedData: Record<string, any> | null;

      // Check if fetchdata is a function or direct data
      if (typeof fetchdata === "function") {
        // It's a function, call it to get data
        fetchedData = await fetchdata();
      } else if (fetchdata !== undefined) {
        // It's direct data, use it as is
        fetchedData = fetchdata;
      }

      // Update the data state with the fetched or provided data
      setData((prev) => ({ ...prev, [modalId]: fetchedData || null }));

      // Rest of the function remains the same
      setIsOpen((prev) => ({ ...prev, [modalId]: true }));
      setModals((prev) => ({ ...prev, [modalId]: modal }));
      setCanCloseState((prev) =>
        prev[modalId] === true ? prev : { ...prev, [modalId]: true }
      );
    } catch (error) {
      console.error("Error in modal setOpen:", error);
      // Still open the modal even if there was an error with data fetching
      setIsOpen((prev) => ({ ...prev, [modalId]: true }));
      setModals((prev) => ({ ...prev, [modalId]: modal }));
    }
  };

  const setClose = (modalId: string = "default") => {
    if (canClose[modalId] !== false) {
      setIsOpen((prev) => ({ ...prev, [modalId]: false }));
      setData((prev) => ({ ...prev, [modalId]: null }));
      setModals((prev) => {
        const newState = { ...prev };
        delete newState[modalId];
        return newState;
      });
      setCanCloseState((prev) => {
        const newState = { ...prev };
        delete newState[modalId];
        return newState;
      });
    }
  };

  const setCanClose = (modalId: string, value: boolean) => {
    setCanCloseState((prev) => {
      // Only update if the value changes
      if (prev[modalId] === value) return prev;
      return { ...prev, [modalId]: value };
    });
  };

  return (
    <ModalContext.Provider
      value={{ data, isOpen, canClose, setOpen, setClose, setCanClose }}
    >
      {children}
      {Object.entries(modals).map(
        ([id, modal]) =>
          isOpen[id] && <React.Fragment key={id}>{modal}</React.Fragment>
      )}
    </ModalContext.Provider>
  );
};

export default ModalProvider;

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};
