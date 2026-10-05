import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Pagination } from "../types/api";
import { ApiError } from "../services/api/apiClient";
import type { MasterDataListQuery, RecordStatus } from "../types/masterData";
import type { ResourceService } from "../services/masterData/resourceService";
import AppNavigation from "./AppNavigation";
import { usePermissions } from "../auth/usePermissions";
import "../pages/Warehouses/warehouse.css";
import "./masterDataPage.css";

export interface MasterDataRecord {
  _id: string;
  isActive: boolean;
}

export interface MasterDataField {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select";
  required?: boolean;
  min?: number;
  options?: Array<{ value: string; label: string }>;
  loadOptions?: () => Promise<Array<{ value: string; label: string }>>;
}

export interface MasterDataColumn<TRecord> {
  label: string;
  value(record: TRecord): string;
}

export interface MasterDataPageConfig<
  TRecord extends MasterDataRecord,
  TInput,
> {
  title: string;
  singular: string;
  path: string;
  permission: Parameters<ReturnType<typeof usePermissions>["can"]>[0];
  service: ResourceService<TRecord, TInput>;
  columns: MasterDataColumn<TRecord>[];
  fields: MasterDataField[];
  filters?: MasterDataField[];
  initialValues: Record<string, string>;
  fromRecord(record: TRecord): Record<string, string>;
  toInput(values: Record<string, string>): TInput;
  sortFields: string[];
  defaultSort: string;
}

function getErrorText(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "The request could not be completed. Please try again.";
  }
  if (error.status === 400 || error.status === 409) {
    const details = error.details;
    const detailMessages =
      typeof details === "object" && details !== null
        ? Object.entries(details).flatMap(([field, value]) => {
            if (field === "field") return [];
            const values = Array.isArray(value) ? value : [value];
            return values
              .filter(
                (message): message is string => typeof message === "string",
              )
              .map((message) => `${field}: ${message}`);
          })
        : [];
    return [error.message, ...detailMessages].join(" ");
  }
  if (error.status === 403) {
    return "You do not have access to this record or action.";
  }
  if (error.status === 401) {
    return "Your session has expired. Sign in again.";
  }
  if (error.status === 404) {
    return "This record could not be found. Refresh the list and try again.";
  }
  if (error.status === 503) {
    return "The service is temporarily unavailable. Try again shortly.";
  }
  if (error.status === 500) {
    return "The server could not complete the request. Try again shortly.";
  }
  if (error.status === null) {
    return "The API could not be reached. Check the network connection.";
  }
  return error.message;
}

export default function MasterDataPage<
  TRecord extends MasterDataRecord,
  TInput,
>({ config }: { config: MasterDataPageConfig<TRecord, TInput> }) {
  const { can } = usePermissions();
  const canMutate = can(config.permission);
  const [filters, setFilters] = useState<MasterDataListQuery>({
    page: 1,
    limit: 20,
    search: "",
    status: "all",
    sortBy: config.defaultSort,
    sortOrder: "asc",
  });
  const [searchText, setSearchText] = useState("");
  const [records, setRecords] = useState<TRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [fieldOptions, setFieldOptions] = useState<
    Record<string, Array<{ value: string; label: string }>>
  >({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailRecord, setDetailRecord] = useState<TRecord | null>(null);
  const [detailRequestId, setDetailRequestId] = useState<string | null>(null);
  const [busyRecordId, setBusyRecordId] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [filterOptionsRetry, setFilterOptionsRetry] = useState(0);
  const requestSequence = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutationInFlight = useRef(false);
  const statusMutationInFlight = useRef(false);
  const pageCount = Math.max(1, pagination.totalPages);

  useEffect(() => {
    const sequence = ++requestSequence.current;

    const request = Promise.resolve().then(() => {
      if (sequence !== requestSequence.current) return null;
      setIsLoading(true);
      setListError("");
      return config.service.list(filters);
    });
    void request
      .then((response) => {
        if (sequence !== requestSequence.current || !response) return;
        if (
          response.pagination.totalPages > 0 &&
          filters.page !== undefined &&
          filters.page > response.pagination.totalPages
        ) {
          setIsLoading(true);
          setFilters((current) => ({
            ...current,
            page: response.pagination.totalPages,
          }));
          return;
        }
        setRecords(response.data);
        setPagination(response.pagination);
        setListError("");
      })
      .catch((error: unknown) => {
        if (sequence !== requestSequence.current) return;
        setRecords([]);
        setListError(getErrorText(error));
      })
      .finally(() => {
        if (sequence === requestSequence.current) setIsLoading(false);
      });

    return () => {
      requestSequence.current += 1;
    };
  }, [config, filters, reloadCount]);

  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  useEffect(() => {
    let isCurrent = true;
    const filterFields = config.filters ?? [];
    if (filterFields.length === 0) return;

    const request = Promise.resolve().then(() => {
      if (!isCurrent) return [];
      setFilterError("");
      return Promise.all(
        filterFields.map(
          async (field) =>
            [
              field.name,
              field.loadOptions
                ? await field.loadOptions()
                : (field.options ?? []),
            ] as const,
        ),
      );
    });
    void request
      .then((options) => {
        if (isCurrent) {
          setFilterError("");
          setFieldOptions((current) => ({
            ...current,
            ...Object.fromEntries(options),
          }));
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) setFilterError(getErrorText(error));
      });

    return () => {
      isCurrent = false;
    };
  }, [config, filterOptionsRetry]);

  async function loadOptions(): Promise<void> {
    setIsLoadingForm(true);
    setFormError("");
    try {
      const options = await Promise.all(
        config.fields.map(
          async (field) =>
            [
              field.name,
              field.loadOptions
                ? (fieldOptions[field.name] ?? (await field.loadOptions()))
                : (field.options ?? []),
            ] as const,
        ),
      );
      setFieldOptions((current) => ({
        ...current,
        ...Object.fromEntries(options),
      }));
    } catch (error) {
      setFormError(getErrorText(error));
    } finally {
      setIsLoadingForm(false);
    }
  }

  function startCreate(): void {
    setEditingId(null);
    setDetailRecord(null);
    setFormValues(config.initialValues);
    setFormError("");
    setIsFormOpen(true);
    void loadOptions();
  }

  async function startDetail(recordId: string, edit = false): Promise<void> {
    setDetailRequestId(recordId);
    setFormError("");
    setDetailError("");
    setIsLoadingDetail(true);
    setIsLoadingForm(true);
    if (edit) setIsFormOpen(false);
    try {
      const record = await config.service.get(recordId);
      if (edit) {
        setDetailRecord(null);
        setEditingId(record._id);
        setFormValues(config.fromRecord(record));
        setIsFormOpen(true);
        await loadOptions();
      } else {
        setDetailRecord(record);
      }
    } catch (error) {
      if (edit) setFormError(getErrorText(error));
      else setDetailError(getErrorText(error));
    } finally {
      setIsLoadingForm(false);
      setIsLoadingDetail(false);
    }
  }

  async function submitForm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setIsSaving(true);
    setFormError("");
    setSuccessMessage("");
    try {
      const input = config.toInput(formValues);
      const wasEditing = editingId !== null;
      if (editingId) {
        await config.service.update(editingId, input);
      } else {
        await config.service.create(input);
      }
      setIsFormOpen(false);
      setDetailRecord(null);
      setSuccessMessage(
        `${config.singular} ${wasEditing ? "updated" : "created"}.`,
      );
      setIsLoading(true);
      setListError("");
      setReloadCount((count) => count + 1);
    } catch (error) {
      setFormError(getErrorText(error));
    } finally {
      mutationInFlight.current = false;
      setIsSaving(false);
    }
  }

  async function toggleStatus(record: TRecord): Promise<void> {
    if (statusMutationInFlight.current) return;
    statusMutationInFlight.current = true;
    setBusyRecordId(record._id);
    setListError("");
    try {
      await config.service.setStatus(record._id, !record.isActive);
      setSuccessMessage(
        `${config.singular} ${record.isActive ? "deactivated" : "activated"}.`,
      );
      setIsLoading(true);
      setReloadCount((count) => count + 1);
    } catch (error) {
      setListError(getErrorText(error));
    } finally {
      statusMutationInFlight.current = false;
      setBusyRecordId(null);
    }
  }

  function updateFilter<K extends keyof MasterDataListQuery>(
    key: K,
    value: MasterDataListQuery[K],
  ): void {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    setIsLoading(true);
    setListError("");
    setSuccessMessage("");
    setFilters((current) => ({
      ...current,
      ...(searchText !== current.search ? { search: searchText } : {}),
      [key]: value,
      page:
        key === "page" && searchText === current.search ? (value as number) : 1,
    }));
  }

  function updateSearch(value: string): void {
    setSearchText(value);
    setIsLoading(true);
    setListError("");
    setSuccessMessage("");
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setFilters((current) => ({ ...current, search: value, page: 1 }));
      searchTimer.current = null;
    }, 300);
  }

  const detailContent = detailRecord && (
    <section className="warehouse-form" aria-label={`${config.title} details`}>
      <div className="master-data-form-heading">
        <h2>{config.title} details</h2>
        <button type="button" onClick={() => setDetailRecord(null)}>
          Close
        </button>
      </div>
      <dl className="master-data-details">
        {config.columns.map((column) => (
          <div key={column.label}>
            <dt>{column.label}</dt>
            <dd>{column.value(detailRecord)}</dd>
          </div>
        ))}
        <div>
          <dt>Status</dt>
          <dd>{detailRecord.isActive ? "Active" : "Inactive"}</dd>
        </div>
      </dl>
      {canMutate && (
        <button
          type="button"
          onClick={() => void startDetail(detailRecord._id, true)}
        >
          Edit
        </button>
      )}
    </section>
  );

  return (
    <div className="dashboard-wrapper">
      <AppNavigation activePath={config.path} />
      <main className="main-content">
        <div className="topbar">
          <h1>{config.title}</h1>
          {canMutate && (
            <button className="add-warehouse-btn" onClick={startCreate}>
              + Add {config.singular}
            </button>
          )}
        </div>

        {detailContent}
        {isLoadingDetail && <p role="status">Loading record details...</p>}
        {detailError && (
          <p className="master-data-error" role="alert">
            {detailError}
            <button
              type="button"
              onClick={() => {
                if (detailRequestId) void startDetail(detailRequestId);
              }}
            >
              Retry
            </button>
          </p>
        )}
        {successMessage && <p role="status">{successMessage}</p>}

        {isFormOpen && (
          <form className="warehouse-form" onSubmit={submitForm}>
            <h2>
              {editingId ? `Edit ${config.singular}` : `Add ${config.singular}`}
            </h2>
            {config.fields.map((field) => (
              <label key={field.name} className="master-data-field">
                {field.label}
                {field.type === "textarea" ? (
                  <textarea
                    name={field.name}
                    value={formValues[field.name] ?? ""}
                    onChange={(event) =>
                      setFormValues((values) => ({
                        ...values,
                        [field.name]: event.target.value,
                      }))
                    }
                    required={field.required}
                  />
                ) : field.type === "select" ? (
                  <select
                    name={field.name}
                    value={formValues[field.name] ?? ""}
                    onChange={(event) =>
                      setFormValues((values) => ({
                        ...values,
                        [field.name]: event.target.value,
                      }))
                    }
                    required={field.required}
                    disabled={isLoadingForm}
                  >
                    <option value="">Select {field.label.toLowerCase()}</option>
                    {(fieldOptions[field.name] ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type ?? "text"}
                    name={field.name}
                    value={formValues[field.name] ?? ""}
                    onChange={(event) =>
                      setFormValues((values) => ({
                        ...values,
                        [field.name]: event.target.value,
                      }))
                    }
                    required={field.required}
                    min={field.min}
                  />
                )}
              </label>
            ))}
            {formError && (
              <p className="master-data-error" role="alert">
                {formError}
              </p>
            )}
            <div className="master-data-actions">
              <button type="submit" disabled={isSaving || isLoadingForm}>
                {isSaving ? "Saving..." : editingId ? "Save changes" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="master-data-filters">
          <input
            aria-label={`Search ${config.title.toLowerCase()}`}
            placeholder="Search"
            value={searchText}
            onChange={(event) => updateSearch(event.target.value)}
          />
          <select
            aria-label="Status filter"
            value={filters.status ?? "all"}
            onChange={(event) =>
              updateFilter("status", event.target.value as RecordStatus)
            }
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            aria-label="Sort field"
            value={filters.sortBy ?? config.defaultSort}
            onChange={(event) => updateFilter("sortBy", event.target.value)}
          >
            {config.sortFields.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort order"
            value={filters.sortOrder ?? "asc"}
            onChange={(event) =>
              updateFilter("sortOrder", event.target.value as "asc" | "desc")
            }
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
          <select
            aria-label="Page size"
            value={filters.limit ?? 20}
            onChange={(event) =>
              updateFilter("limit", Number(event.target.value))
            }
          >
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
          {config.filters?.map((field) => (
            <select
              key={field.name}
              aria-label={field.label}
              value={String(filters[field.name] ?? "")}
              onChange={(event) =>
                updateFilter(field.name, event.target.value || undefined)
              }
            >
              <option value="">All {field.label.toLowerCase()}</option>
              {(fieldOptions[field.name] ?? field.options ?? []).map(
                (option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ),
              )}
            </select>
          ))}
        </div>

        {filterError && (
          <p className="master-data-error" role="alert">
            {filterError}
            <button
              type="button"
              onClick={() => setFilterOptionsRetry((count) => count + 1)}
            >
              Retry filter options
            </button>
          </p>
        )}
        {listError && (
          <p className="master-data-error" role="alert">
            {listError}
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setReloadCount((count) => count + 1);
              }}
            >
              Retry
            </button>
          </p>
        )}
        {isLoading ? (
          <p role="status">Loading {config.title.toLowerCase()}...</p>
        ) : listError ? null : records.length === 0 ? (
          <p role="status">
            {filters.search ||
            filters.status !== "all" ||
            config.filters?.some((field) => filters[field.name] !== undefined)
              ? `No ${config.title.toLowerCase()} match these filters.`
              : `No ${config.title.toLowerCase()} exist yet.`}
          </p>
        ) : (
          <table className="activity-table">
            <thead>
              <tr>
                {config.columns.map((column) => (
                  <th key={column.label}>{column.label}</th>
                ))}
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record._id}>
                  {config.columns.map((column) => (
                    <td key={column.label}>{column.value(record)}</td>
                  ))}
                  <td>
                    <span
                      className={`pill ${record.isActive ? "pill-ok" : "pill-danger"}`}
                    >
                      {record.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="master-data-row-actions">
                    <button
                      type="button"
                      onClick={() => void startDetail(record._id)}
                    >
                      View
                    </button>
                    {canMutate && (
                      <>
                        <button
                          type="button"
                          onClick={() => void startDetail(record._id, true)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleStatus(record)}
                          disabled={busyRecordId === record._id}
                        >
                          {busyRecordId === record._id
                            ? "Updating..."
                            : record.isActive
                              ? "Deactivate"
                              : "Activate"}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="master-data-pagination">
          <span>
            Page {pagination.page} of {pageCount} ({pagination.totalItems}{" "}
            total)
          </span>
          <button
            type="button"
            onClick={() =>
              updateFilter("page", Math.max(1, pagination.page - 1))
            }
            disabled={isLoading || pagination.page <= 1}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() =>
              updateFilter("page", Math.min(pageCount, pagination.page + 1))
            }
            disabled={isLoading || pagination.page >= pageCount}
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
}
