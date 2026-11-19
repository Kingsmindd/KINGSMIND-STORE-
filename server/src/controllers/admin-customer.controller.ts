import type { Request, Response, NextFunction } from "express";
import type { Pool } from "pg";
import {
  AdminCustomerError,
  suspendCustomerService,
  reactivateCustomerService,
  deleteCustomerService,
  listAdminCustomersService,
} from "../services/admin-customer.service.js";

export function createAdminCustomerController(pool: Pool) {
  function createStatusController(action: "suspend" | "reactivate") {
    return async function customerStatusController(
      req: Request,
      res: Response,
      next: NextFunction,
    ): Promise<void> {
      res.setHeader("Cache-Control", "no-store");

      try {
        const customerId = req.params.customerId;

        if (
          typeof customerId !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            customerId,
          )
        ) {
          throw new AdminCustomerError("Invalid customer ID.", 400);
        }

        const customer =
          action === "suspend"
            ? await suspendCustomerService(pool, customerId)
            : await reactivateCustomerService(pool, customerId);

        res.status(200).json({
          message:
            action === "suspend"
              ? "Customer account suspended."
              : "Customer account reactivated. The customer can log in again.",
          customer,
        });
      } catch (error: unknown) {
        if (error instanceof AdminCustomerError) {
          res.status(error.statusCode).json({
            error: error.message,
          });
          return;
        }

        next(error);
      }
    };
  }

  async function deleteCustomerController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const customerId = req.params.customerId;

      if (
        typeof customerId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          customerId,
        )
      ) {
        throw new AdminCustomerError("Invalid customer ID.", 400);
      }

      const customer = await deleteCustomerService(pool, customerId);

      res.status(200).json({
        message: "Customer account permanently deleted.",
        customer,
      });
    } catch (error: unknown) {
      if (error instanceof AdminCustomerError) {
        res.status(error.statusCode).json({
          error: error.message,
        });
        return;
      }

      next(error);
    }
  }

  async function listAdminCustomersController(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    res.setHeader("Cache-Control", "no-store");

    try {
      const rawPage = req.query.page;

      if (
        rawPage !== undefined &&
        (typeof rawPage !== "string" || !/^\d+$/.test(rawPage))
      ) {
        throw new AdminCustomerError("Page must be a whole number.", 400);
      }

      const page = rawPage === undefined ? 1 : Number(rawPage);
      const result = await listAdminCustomersService(pool, page);

      res.status(200).json(result);
    } catch (error: unknown) {
      if (error instanceof AdminCustomerError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      next(error);
    }
  }

  return {
    suspendCustomerController: createStatusController("suspend"),
    reactivateCustomerController: createStatusController("reactivate"),
    deleteCustomerController,
    listAdminCustomersController,
  };
}
